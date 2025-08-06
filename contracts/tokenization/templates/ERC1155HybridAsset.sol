// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

/**
 * @title ERC1155HybridAsset
 * @notice ERC1155 token with hybrid functionality for both fungible and non-fungible tokens
 * @dev Supports collateral, lending, and yield generation for both token types
 */
contract ERC1155HybridAsset is 
    Initializable,
    ERC1155Upgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    
    // Token type: 0 = Non-Fungible, 1 = Fungible
    enum TokenType { NonFungible, Fungible }
    
    // Token metadata
    struct TokenInfo {
        TokenType tokenType;
        string name;
        string symbol;
        uint256 totalSupply;
        uint256 maxSupply; // 0 = unlimited
        uint256 mintingFee; // In basis points
        bool isActive;
    }
    
    // Collateral details
    struct Collateral {
        address token;      // Address of the collateral token (address(0) for native token)
        uint256 amount;     // Amount of collateral
        uint256 lockedAt;   // Timestamp when collateral was locked
        uint256 lockPeriod; // Minimum lock period in seconds (0 = no lock period)
    }
    
    // Loan details
    struct LoanDetails {
        address lender;
        uint256 loanAmount;
        uint256 interestRate; // In basis points (e.g., 500 = 5%)
        uint256 duration;     // In seconds
        uint256 borrowedAt;   // Timestamp when loan was taken
        bool isActive;
    }
    
    // Constants
    uint256 public constant MAX_FEE = 10000; // 100%
    
    // Token state
    mapping(uint256 => TokenInfo) public tokenInfo;
    uint256 public nextTokenId = 1; // Starting token ID (0 is not used)
    
    // Collateral state
    mapping(uint256 => mapping(address => Collateral[])) private _tokenCollaterals;
    mapping(uint256 => mapping(address => uint256)) public userCollateralValue;
    
    // Loan state
    mapping(uint256 => mapping(address => LoanDetails)) public tokenLoans;
    
    // Supported collateral tokens (whitelist)
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    EnumerableSetUpgradeable.AddressSet private _supportedCollateralTokens;
    
    // Fee configuration
    address public feeRecipient;
    
    // Events
    event TokenCreated(
        uint256 indexed tokenId,
        TokenType tokenType,
        string name,
        string symbol,
        uint256 maxSupply,
        uint256 mintingFee
    );
    
    event Minted(
        address indexed to,
        uint256 indexed tokenId,
        uint256 amount,
        bytes data
    );
    
    event CollateralAdded(
        address indexed account,
        uint256 indexed tokenId,
        address indexed collateralToken,
        uint256 amount,
        uint256 lockPeriod
    );
    
    event CollateralRemoved(
        address indexed account,
        uint256 indexed tokenId,
        address indexed collateralToken,
        uint256 amount,
        address to
    );
    
    event LoanInitiated(
        address indexed borrower,
        uint256 indexed tokenId,
        address indexed lender,
        uint256 loanAmount,
        uint256 interestRate,
        uint256 duration
    );
    
    event LoanRepaid(
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 amountRepaid
    );
    
    event LoanLiquidated(
        address indexed liquidator,
        address indexed borrower,
        uint256 indexed tokenId,
        uint256 collateralSeized
    );
    
    event FeesUpdated(
        address feeRecipient
    );
    
    event CollateralTokenAdded(address indexed token);
    event CollateralTokenRemoved(address indexed token);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the ERC1155 Hybrid Asset
     * @param _uri Base URI for token metadata
     * @param _owner Owner of the contract
     * @param _mintingFee Default minting fee in basis points
     * @param _feeRecipient Address to receive fees
     */
    function initialize(
        string memory _uri,
        address _owner,
        uint256 _mintingFee,
        address _feeRecipient
    ) external initializer {
        require(_owner != address(0), "Invalid owner address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_mintingFee <= 1000, "Minting fee too high"); // Max 10%
        
        // Set URI
        _setURI(_uri);
        
        // Set fee configuration
        feeRecipient = _feeRecipient;
        
        // Create a default fungible token (ID 0 is not used, start from 1)
        _createToken("Hybrid Asset", "HYBRID", TokenType.Fungible, type(uint256).max, _mintingFee);
        
        // Transfer ownership
        _transferOwnership(_owner);
    }
    
    // ============ Token Management ============
    
    /**
     * @notice Create a new token type
     * @param name Name of the token
     * @param symbol Symbol of the token
     * @param tokenType Type of token (0 = Non-Fungible, 1 = Fungible)
     * @param maxSupply Maximum supply (0 = unlimited)
     * @param _mintingFee Minting fee in basis points
     * @return tokenId ID of the newly created token
     */
    function createToken(
        string memory name,
        string memory symbol,
        TokenType tokenType,
        uint256 maxSupply,
        uint256 _mintingFee
    ) external onlyOwner returns (uint256) {
        return _createToken(name, symbol, tokenType, maxSupply, _mintingFee);
    }
    
    /**
     * @dev Internal function to create a new token
     */
    function _createToken(
        string memory name,
        string memory symbol,
        TokenType tokenType,
        uint256 maxSupply,
        uint256 _mintingFee
    ) internal returns (uint256) {
        uint256 tokenId = nextTokenId++;
        
        tokenInfo[tokenId] = TokenInfo({
            tokenType: tokenType,
            name: name,
            symbol: symbol,
            totalSupply: 0,
            maxSupply: maxSupply,
            mintingFee: _mintingFee,
            isActive: true
        });
        
        emit TokenCreated(tokenId, tokenType, name, symbol, maxSupply, _mintingFee);
        return tokenId;
    }
    
    /**
     * @notice Mint tokens (only callable by owner)
     * @param to Address to mint tokens to
     * @param tokenId ID of the token to mint
     * @param amount Amount to mint (must be 1 for Non-Fungible tokens)
     * @param data Additional data
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) external onlyOwner nonReentrant {
        require(tokenId > 0 && tokenId < nextTokenId, "Invalid token ID");
        TokenInfo storage info = tokenInfo[tokenId];
        require(info.isActive, "Token is not active");
        
        if (info.tokenType == TokenType.NonFungible) {
            require(amount == 1, "Can only mint 1 NFT at a time");
        }
        
        if (info.maxSupply > 0) {
            require(info.totalSupply + amount <= info.maxSupply, "Exceeds max supply");
        }
        
        // Update total supply
        info.totalSupply += amount;
        
        // Mint tokens
        _mint(to, tokenId, amount, data);
        
        emit Minted(to, tokenId, amount, data);
    }
    
    // ============ Collateral Management ============
    
    /**
     * @notice Add collateral to a token
     * @param tokenId ID of the token to add collateral to
     * @param collateralToken Address of the collateral token (address(0) for native token)
     * @param amount Amount of collateral to add
     * @param lockPeriod Minimum lock period in seconds (0 = no lock period)
     */
    function addCollateral(
        uint256 tokenId,
        address collateralToken,
        uint256 amount,
        uint256 lockPeriod
    ) external payable nonReentrant {
        require(tokenId > 0 && tokenId < nextTokenId, "Invalid token ID");
        require(amount > 0, "Amount must be greater than 0");
        require(
            collateralToken == address(0) || _supportedCollateralTokens.contains(collateralToken),
            "Unsupported collateral token"
        );
        
        // For native token, use msg.value, otherwise transfer ERC20
        if (collateralToken == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            IERC20Upgradeable(collateralToken).safeTransferFrom(msg.sender, address(this), amount);
        }
        
        // Add collateral
        _tokenCollaterals[tokenId][msg.sender].push(Collateral({
            token: collateralToken,
            amount: amount,
            lockedAt: block.timestamp,
            lockPeriod: lockPeriod
        }));
        
        // Update collateral value (in a real implementation, use price oracle)
        userCollateralValue[tokenId][msg.sender] += amount;
        
        emit CollateralAdded(msg.sender, tokenId, collateralToken, amount, lockPeriod);
    }
    
    /**
     * @notice Remove collateral from a token
     * @param tokenId ID of the token to remove collateral from
     * @param collateralIndex Index of the collateral to remove
     * @param to Address to send the collateral to
     */
    function removeCollateral(
        uint256 tokenId,
        uint256 collateralIndex,
        address to
    ) external nonReentrant {
        require(tokenId > 0 && tokenId < nextTokenId, "Invalid token ID");
        require(to != address(0), "Invalid recipient address");
        
        Collateral[] storage collaterals = _tokenCollaterals[tokenId][msg.sender];
        require(collateralIndex < collaterals.length, "Invalid collateral index");
        
        Collateral storage collateral = collaterals[collateralIndex];
        
        // Check if collateral is still locked
        require(
            block.timestamp >= collateral.lockedAt + collateral.lockPeriod,
            "Collateral is still locked"
        );
        
        // Check if token has an active loan
        require(!tokenLoans[tokenId][msg.sender].isActive, "Cannot remove collateral with active loan");
        
        uint256 amount = collateral.amount;
        address token = collateral.token;
        
        // Remove collateral from array
        uint256 lastIndex = collaterals.length - 1;
        if (collateralIndex < lastIndex) {
            collaterals[collateralIndex] = collaterals[lastIndex];
        }
        collaterals.pop();
        
        // Update collateral value
        userCollateralValue[tokenId][msg.sender] -= amount;
        
        // Transfer collateral to the specified address
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20Upgradeable(token).safeTransfer(to, amount);
        }
        
        emit CollateralRemoved(msg.sender, tokenId, token, amount, to);
    }
    
    // ============ Loan Management ============
    
    /**
     * @notice Initiate a loan using tokens as collateral
     * @param tokenId ID of the token to use as collateral
     * @param lender Address of the lender
     * @param loanAmount Amount of the loan
     * @param interestRate Annual interest rate in basis points (e.g., 500 = 5%)
     * @param duration Loan duration in seconds
     */
    function initiateLoan(
        uint256 tokenId,
        address lender,
        uint256 loanAmount,
        uint256 interestRate,
        uint256 duration
    ) external nonReentrant {
        require(tokenId > 0 && tokenId < nextTokenId, "Invalid token ID");
        require(lender != address(0), "Invalid lender address");
        require(loanAmount > 0, "Invalid loan amount");
        require(!tokenLoans[tokenId][msg.sender].isActive, "Loan already active");
        require(userCollateralValue[tokenId][msg.sender] > 0, "No collateral");
        
        // In a real implementation, check loan-to-value ratio here
        
        // Store loan details
        tokenLoans[tokenId][msg.sender] = LoanDetails({
            lender: lender,
            loanAmount: loanAmount,
            interestRate: interestRate,
            duration: duration,
            borrowedAt: block.timestamp,
            isActive: true
        });
        
        // Transfer loan amount to the borrower
        (bool success, ) = payable(msg.sender).call{value: loanAmount}("");
        require(success, "Loan transfer failed");
        
        emit LoanInitiated(msg.sender, tokenId, lender, loanAmount, interestRate, duration);
    }
    
    /**
     * @notice Repay a loan
     * @param tokenId ID of the token with the active loan
     */
    function repayLoan(uint256 tokenId) external payable nonReentrant {
        require(tokenId > 0 && tokenId < nextTokenId, "Invalid token ID");
        
        LoanDetails storage loan = tokenLoans[tokenId][msg.sender];
        require(loan.isActive, "No active loan");
        
        uint256 interest = calculateInterest(loan.loanAmount, loan.interestRate, loan.borrowedAt);
        uint256 totalRepayment = loan.loanAmount + interest;
        
        // Transfer repayment from borrower to lender
        if (msg.value > 0) {
            // Native token payment
            require(msg.value >= totalRepayment, "Insufficient repayment amount");
            (bool success, ) = payable(loan.lender).call{value: totalRepayment}("");
            require(success, "Repayment transfer failed");
            
            // Return excess payment
            if (msg.value > totalRepayment) {
                (success, ) = payable(msg.sender).call{value: msg.value - totalRepayment}("");
                require(success, "Excess return failed");
            }
        } else {
            // In a real implementation, support ERC20 repayments
            revert("ERC20 repayments not implemented");
        }
        
        // Mark loan as repaid
        delete tokenLoans[tokenId][msg.sender];
        
        emit LoanRepaid(msg.sender, tokenId, totalRepayment);
    }
    
    /**
     * @notice Liquidate an undercollateralized loan
     * @param borrower Address of the borrower
     * @param tokenId ID of the token with the loan to liquidate
     */
    function liquidateLoan(address borrower, uint256 tokenId) external nonReentrant {
        require(tokenId > 0 && tokenId < nextTokenId, "Invalid token ID");
        
        LoanDetails storage loan = tokenLoans[tokenId][borrower];
        require(loan.isActive, "No active loan");
        require(
            block.timestamp > loan.borrowedAt + loan.duration,
            "Loan not yet defaulted"
        );
        
        // In a real implementation, check collateral ratio here
        
        // Transfer collateral to liquidator
        Collateral[] storage collaterals = _tokenCollaterals[tokenId][borrower];
        uint256 totalSeized = 0;
        
        for (uint256 i = 0; i < collaterals.length; i++) {
            Collateral memory collateral = collaterals[i];
            if (collateral.token == address(0)) {
                (bool success, ) = payable(msg.sender).call{value: collateral.amount}("");
                require(success, "ETH transfer failed");
            } else {
                IERC20Upgradeable(collateral.token).safeTransfer(msg.sender, collateral.amount);
            }
            totalSeized += collateral.amount;
            
            emit CollateralRemoved(borrower, tokenId, collateral.token, collateral.amount, msg.sender);
        }
        
        // Clear collateral and loan data
        delete _tokenCollaterals[tokenId][borrower];
        delete userCollateralValue[tokenId][borrower];
        delete tokenLoans[tokenId][borrower];
        
        emit LoanLiquidated(msg.sender, borrower, tokenId, totalSeized);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Add a supported collateral token
     * @param token Address of the token to add
     */
    function addSupportedCollateralToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        require(_supportedCollateralTokens.add(token), "Token already supported");
        emit CollateralTokenAdded(token);
    }
    
    /**
     * @notice Remove a supported collateral token
     * @param token Address of the token to remove
     */
    function removeSupportedCollateralToken(address token) external onlyOwner {
        require(_supportedCollateralTokens.remove(token), "Token not supported");
        emit CollateralTokenRemoved(token);
    }
    
    /**
     * @notice Initialize the contract
     * @param uri_ Base URI for token metadata
     * @param _feeRecipient Address to receive fees
     */
    function initialize(string memory uri_, address _feeRecipient) public initializer {
        __ERC1155_init(uri_);
        __Ownable_init();
        __ReentrancyGuard_init();
        
        require(_feeRecipient != address(0), "Invalid fee recipient");
        _transferOwnership(msg.sender);
        feeRecipient = _feeRecipient;
        nextTokenId = 1; // Start token IDs from 1
    }
    
    /**
     * @notice Update fee configuration
     * @param _feeRecipient New fee recipient address
     */
    function updateFees(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
        emit FeesUpdated(_feeRecipient);
    }
    
    /**
     * @notice Update token minting fee
     * @param tokenId ID of the token to update
     * @param newMintingFee New minting fee in basis points
     */
    function updateTokenMintingFee(uint256 tokenId, uint256 newMintingFee) external onlyOwner {
        require(tokenId > 0 && tokenId < nextTokenId, "Invalid token ID");
        require(newMintingFee <= 1000, "Minting fee too high"); // Max 10%
        
        TokenInfo storage info = tokenInfo[tokenId];
        info.mintingFee = newMintingFee;
    }
    
    // ============ Public View Functions ============
    
    /**
     * @notice Calculate interest for a loan
     * @param principal Loan principal amount
     * @param rate Annual interest rate in basis points
     * @param startTime Timestamp when the loan started
     * @return interest Accrued interest
     */
    function calculateInterest(
        uint256 principal,
        uint256 rate,
        uint256 startTime
    ) public view returns (uint256) {
        uint256 timeElapsed = block.timestamp - startTime;
        // Simple interest calculation: (principal * rate * time) / (365 days * 10000)
        return (principal * rate * timeElapsed) / (365 days * 100);
    }
    
    /**
     * @notice Get the list of supported collateral tokens
     * @return Array of token addresses
     */
    function getSupportedCollateralTokens() external view returns (address[] memory) {
        return _supportedCollateralTokens.values();
    }
    
    /**
     * @notice Get collateral details for a user and token
     * @param account User address
     * @param tokenId ID of the token
     * @return Array of Collateral structs
     */
    function getUserCollaterals(
        address account, 
        uint256 tokenId
    ) external view returns (Collateral[] memory) {
        return _tokenCollaterals[tokenId][account];
    }
    
    /**
     * @notice Get token URI (overrides ERC1155)
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(tokenId > 0 && tokenId < nextTokenId, "Nonexistent token");
        return string(abi.encodePacked(super.uri(tokenId), _toString(tokenId)));
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    // ============ Receive Function ============
    
    /**
     * @dev Required to receive native tokens
     */
    receive() external payable {}
}
