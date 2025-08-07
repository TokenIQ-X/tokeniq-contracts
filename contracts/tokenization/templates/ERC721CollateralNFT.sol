// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

/**
 * @title ERC721CollateralNFT
 * @notice ERC721 token with built-in collateral functionality for unique assets
 * @dev Supports multiple collateral types (ERC20, native token) per NFT
 */
contract ERC721CollateralNFT is 
    Initializable,
    ERC721Upgradeable, 
    ERC721EnumerableUpgradeable, 
    ERC721URIStorageUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    
    // Token ID counter
    CountersUpgradeable.Counter private _tokenIdCounter;
    
    // Base token URI
    string private _baseTokenURI;
    
    // Fee configuration
    uint256 public constant MAX_FEE = 10000; // 100%
    uint256 public mintingFee;           // Minting fee in basis points
    address public feeRecipient;         // Address to receive fees
    
    // Mapping from token ID to collateral details
    struct Collateral {
        address token;      // Address of the collateral token (address(0) for native token)
        uint256 amount;     // Amount of collateral
        uint256 lockedAt;   // Timestamp when collateral was locked
        uint256 lockPeriod; // Minimum lock period in seconds (0 = no lock period)
    }
    
    // Mapping from token ID to array of collaterals
    mapping(uint256 => Collateral[]) private _tokenCollaterals;
    
    // Mapping from token ID to total collateral value in USD (or other stable unit)
    mapping(uint256 => uint256) public tokenCollateralValue;
    
    // Mapping from token ID to loan details (if used as collateral in a loan)
    struct LoanDetails {
        address lender;
        uint256 loanAmount;
        uint256 interestRate; // In basis points (e.g., 500 = 5%)
        uint256 duration;     // In seconds
        uint256 borrowedAt;   // Timestamp when loan was taken
        bool isActive;
    }
    
    mapping(uint256 => LoanDetails) public tokenLoans;
    
    // Supported collateral tokens (whitelist)
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;
    EnumerableSetUpgradeable.AddressSet private _supportedCollateralTokens;
    
    // Events
    event Minted(
        uint256 indexed tokenId,
        address indexed to,
        string tokenURI
    );
    
    event CollateralAdded(
        uint256 indexed tokenId,
        address indexed token,
        uint256 amount,
        uint256 lockPeriod
    );
    
    event CollateralRemoved(
        uint256 indexed tokenId,
        address indexed token,
        uint256 amount,
        address indexed to
    );
    
    event LoanInitiated(
        uint256 indexed tokenId,
        address indexed lender,
        uint256 loanAmount,
        uint256 interestRate,
        uint256 duration
    );
    
    event LoanRepaid(
        uint256 indexed tokenId,
        address indexed borrower,
        uint256 amountRepaid
    );
    
    event LoanLiquidated(
        uint256 indexed tokenId,
        address indexed liquidator,
        uint256 collateralSeized
    );
    
    event FeesUpdated(
        uint256 mintingFee,
        address feeRecipient
    );
    
    event CollateralTokenAdded(address indexed token);
    event CollateralTokenRemoved(address indexed token);

    /**
     * @dev Disable initializers in the implementation contract
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the ERC721 Collateral NFT
     * @param _name Name of the NFT collection
     * @param _symbol Symbol of the NFT collection
     * @param _owner Owner of the contract (can be a DAO or governance contract)
     * @param baseURI_ Base URI for token metadata
     * @param _mintingFee Minting fee in basis points
     * @param _feeRecipient Address to receive fees
     */
    function initialize(
        string memory _name,
        string memory _symbol,
        address _owner,
        string memory baseURI_,
        uint256 _mintingFee,
        address _feeRecipient
    ) external initializer {
        // Initialize parent contracts
        __ERC721_init(_name, _symbol);
        __ERC721Enumerable_init();
        __ERC721URIStorage_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        
        // Validate parameters
        require(_owner != address(0), "Invalid owner address");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_mintingFee <= 1000, "Minting fee too high"); // Max 10%
        
        // Set base URI
        _baseTokenURI = baseURI_;
        
        // Set fee configuration
        mintingFee = _mintingFee;
        feeRecipient = _feeRecipient;
        
        // Transfer ownership
        _transferOwnership(_owner);
    }
    
    /**
     * @notice Mint a new NFT (only callable by owner)
     * @param to Address to mint the NFT to
     * @param tokenURI_ URI for the token metadata
     * @return tokenId The ID of the newly minted token
     */
    function mint(
        address to,
        string memory tokenURI_
    ) external onlyOwner nonReentrant returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        // Mint the token
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        
        emit Minted(tokenId, to, tokenURI_);
        
        return tokenId;
    }
    
    /**
     * @notice Add collateral to an NFT
     * @param tokenId ID of the token to add collateral to
     * @param token Address of the collateral token (address(0) for native token)
     * @param amount Amount of collateral to add
     * @param lockPeriod Minimum lock period in seconds (0 = no lock period)
     */
    function addCollateral(
        uint256 tokenId,
        address token,
        uint256 amount,
        uint256 lockPeriod
    ) external payable nonReentrant {
        require(_exists(tokenId), "Token does not exist");
        require(amount > 0, "Amount must be greater than 0");
        require(
            token == address(0) || _supportedCollateralTokens.contains(token),
            "Unsupported collateral token"
        );
        
        // For native token, use msg.value, otherwise transfer ERC20
        if (token == address(0)) {
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);
        }
        
        // Add collateral to the token
        _tokenCollaterals[tokenId].push(Collateral({
            token: token,
            amount: amount,
            lockedAt: block.timestamp,
            lockPeriod: lockPeriod
        }));
        
        // Update total collateral value (in a real implementation, this would use a price oracle)
        // For now, we'll just use the raw amount
        tokenCollateralValue[tokenId] += amount;
        
        emit CollateralAdded(tokenId, token, amount, lockPeriod);
    }
    
    /**
     * @notice Remove collateral from an NFT
     * @param tokenId ID of the token to remove collateral from
     * @param collateralIndex Index of the collateral to remove
     * @param to Address to send the collateral to
     */
    function removeCollateral(
        uint256 tokenId,
        uint256 collateralIndex,
        address to
    ) external nonReentrant {
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not owner nor approved");
        require(collateralIndex < _tokenCollaterals[tokenId].length, "Invalid collateral index");
        
        Collateral storage collateral = _tokenCollaterals[tokenId][collateralIndex];
        
        // Check if collateral is still locked
        require(
            block.timestamp >= collateral.lockedAt + collateral.lockPeriod,
            "Collateral is still locked"
        );
        
        // Check if token has an active loan
        require(!tokenLoans[tokenId].isActive, "Cannot remove collateral with active loan");
        
        uint256 amount = collateral.amount;
        address token = collateral.token;
        
        // Remove collateral from array
        uint256 lastIndex = _tokenCollaterals[tokenId].length - 1;
        if (collateralIndex < lastIndex) {
            _tokenCollaterals[tokenId][collateralIndex] = _tokenCollaterals[tokenId][lastIndex];
        }
        _tokenCollaterals[tokenId].pop();
        
        // Update total collateral value
        tokenCollateralValue[tokenId] -= amount;
        
        // Transfer collateral to the specified address
        if (token == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            require(success, "ETH transfer failed");
        } else {
            IERC20Upgradeable(token).safeTransfer(to, amount);
        }
        
        emit CollateralRemoved(tokenId, token, amount, to);
    }
    
    /**
     * @notice Initiate a loan using the NFT as collateral
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
        require(_isApprovedOrOwner(msg.sender, tokenId), "Not owner nor approved");
        require(!tokenLoans[tokenId].isActive, "Loan already active");
        require(tokenCollateralValue[tokenId] > 0, "No collateral");
        require(loanAmount > 0, "Invalid loan amount");
        
        // In a real implementation, you would check loan-to-value ratio here
        
        // Store loan details
        tokenLoans[tokenId] = LoanDetails({
            lender: lender,
            loanAmount: loanAmount,
            interestRate: interestRate,
            duration: duration,
            borrowedAt: block.timestamp,
            isActive: true
        });
        
        // Transfer loan amount to the borrower
        (bool success, ) = payable(ownerOf(tokenId)).call{value: loanAmount}("");
        require(success, "Loan transfer failed");
        
        emit LoanInitiated(tokenId, lender, loanAmount, interestRate, duration);
    }
    
    /**
     * @notice Repay a loan and release collateral
     * @param tokenId ID of the token with the active loan
     */
    function repayLoan(uint256 tokenId) external payable nonReentrant {
        require(tokenLoans[tokenId].isActive, "No active loan");
        
        LoanDetails storage loan = tokenLoans[tokenId];
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
            // In a real implementation, you would support ERC20 repayments here
            revert("ERC20 repayments not implemented");
        }
        
        // Mark loan as repaid
        delete tokenLoans[tokenId];
        
        emit LoanRepaid(tokenId, msg.sender, totalRepayment);
    }
    
    /**
     * @notice Liquidate an undercollateralized loan
     * @param tokenId ID of the token with the loan to liquidate
     */
    function liquidateLoan(uint256 tokenId) external nonReentrant {
        require(tokenLoans[tokenId].isActive, "No active loan");
        
        LoanDetails storage loan = tokenLoans[tokenId];
        require(
            block.timestamp > loan.borrowedAt + loan.duration,
            "Loan not yet defaulted"
        );
        
        // In a real implementation, you would check collateral ratio here
        
        // Transfer NFT to liquidator
        address owner = ownerOf(tokenId);
        _transfer(owner, msg.sender, tokenId);
        
        // Transfer collateral to liquidator
        for (uint256 i = 0; i < _tokenCollaterals[tokenId].length; i++) {
            Collateral memory collateral = _tokenCollaterals[tokenId][i];
            if (collateral.token == address(0)) {
                (bool success, ) = payable(msg.sender).call{value: collateral.amount}("");
                require(success, "ETH transfer failed");
            } else {
                IERC20Upgradeable(collateral.token).safeTransfer(msg.sender, collateral.amount);
            }
            
            emit CollateralRemoved(tokenId, collateral.token, collateral.amount, msg.sender);
        }
        
        // Clear collateral and loan data
        delete _tokenCollaterals[tokenId];
        delete tokenCollateralValue[tokenId];
        delete tokenLoans[tokenId];
        
        emit LoanLiquidated(tokenId, msg.sender, tokenCollateralValue[tokenId]);
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
     * @notice Update fee configuration
     * @param _mintingFee New minting fee in basis points
     * @param _feeRecipient New fee recipient address
     */
    function updateFees(
        uint256 _mintingFee,
        address _feeRecipient
    ) external onlyOwner {
        require(_mintingFee <= 1000, "Minting fee too high"); // Max 10%
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        mintingFee = _mintingFee;
        feeRecipient = _feeRecipient;
        
        emit FeesUpdated(_mintingFee, _feeRecipient);
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
     * @notice Get collateral details for a token
     * @param tokenId ID of the token
     * @return Array of Collateral structs
     */
    function getTokenCollaterals(uint256 tokenId) external view returns (Collateral[] memory) {
        return _tokenCollaterals[tokenId];
    }
    
    // ============ Override Functions ============
    
    /**
     * @dev Hook that is called before any token transfer
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Prevent transfers if the token is being used as collateral in an active loan
        if (tokenLoans[tokenId].isActive) {
            revert("Cannot transfer token with active loan");
        }
    }

    function _burn(uint256 tokenId) internal override(ERC721Upgradeable, ERC721URIStorageUpgradeable) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Upgradeable, ERC721EnumerableUpgradeable, ERC721URIStorageUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    
    /**
     * @dev Returns the base URI for token metadata
     */
    function _baseURI() internal view virtual override(ERC721Upgradeable) returns (string memory) {
        return _baseTokenURI;
    }
    
    // ============ Receive Function ============
    
    /**
     * @dev Required to receive native tokens
     */
    receive() external payable {}
}
