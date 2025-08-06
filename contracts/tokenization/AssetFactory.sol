// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./templates/ERC20VaultToken.sol";
import "./templates/ERC721CollateralNFT.sol";
import "./templates/ERC1155HybridAsset.sol";

/**
 * @title AssetFactory
 * @notice Factory contract for deploying minimal proxy clones of token templates
 * @dev Manages the deployment of ERC20, ERC721, and ERC1155 token contracts
 */
contract AssetFactory is Ownable, ReentrancyGuard {
    using Clones for address;
    
    // Template contracts
    address public erc20VaultTokenImpl;
    address public erc721CollateralNFTImpl;
    address public erc1155HybridAssetImpl;
    
    // Fee configuration
    uint256 public mintingFee;           // In basis points (1/100 of a percent)
    address public feeRecipient;         // Address to receive fees
    
    // Asset registry
    struct Asset {
        address assetAddress;    // Address of the deployed asset contract
        address creator;         // Address that created the asset
        TokenType tokenType;     // Type of token (ERC20, ERC721, ERC1155)
        string name;             // Name of the asset
        string symbol;           // Symbol of the asset
        uint256 createdAt;       // Timestamp of creation
    }
    
    // Supported token types
    enum TokenType { ERC20, ERC721, ERC1155 }
    
    // Array of all deployed assets
    address[] public allAssets;
    
    // Mapping from asset address to asset details
    mapping(address => Asset) public assetDetails;
    
    // Mapping from creator to their created assets
    mapping(address => address[]) public creatorAssets;
    
    // Events
    event AssetCreated(
        address indexed assetAddress,
        address indexed creator,
        TokenType tokenType,
        string name,
        string symbol,
        uint256 timestamp
    );
    
    event TemplateUpdated(
        TokenType tokenType,
        address newImplementation
    );
    
    event FeesUpdated(
        uint256 mintingFee,
        address feeRecipient
    );
    
    /**
     * @dev Constructor for the AssetFactory
     * @param _erc20VaultTokenImpl Address of the ERC20VaultToken implementation
     * @param _erc721CollateralNFTImpl Address of the ERC721CollateralNFT implementation
     * @param _erc1155HybridAssetImpl Address of the ERC1155HybridAsset implementation
     * @param _owner Address of the contract owner
     */
    constructor(
        address _erc20VaultTokenImpl,
        address _erc721CollateralNFTImpl,
        address _erc1155HybridAssetImpl,
        address _owner
    ) {
        require(_erc20VaultTokenImpl != address(0), "Invalid ERC20 implementation");
        require(_erc721CollateralNFTImpl != address(0), "Invalid ERC721 implementation");
        require(_erc1155HybridAssetImpl != address(0), "Invalid ERC1155 implementation");
        require(_owner != address(0), "Invalid owner");
        
        // Set template implementations
        erc20VaultTokenImpl = _erc20VaultTokenImpl;
        erc721CollateralNFTImpl = _erc721CollateralNFTImpl;
        erc1155HybridAssetImpl = _erc1155HybridAssetImpl;
        
        // Set fee recipient to owner
        feeRecipient = _owner;
        
        // Transfer ownership
        _transferOwnership(_owner);
    }
    
    // ============ Asset Creation Functions ============
    
    /**
     * @notice Create a new ERC20 Vault Token
     * @param name Name of the token
     * @param symbol Symbol of the token
     * @param underlying Underlying asset address
     * @param feeConfig Fee configuration (deposit, withdrawal, performance)
     * @return Address of the deployed contract
     */
    function createERC20VaultToken(
        string memory name,
        string memory symbol,
        address underlying,
        ERC20VaultToken.FeeConfig memory feeConfig
    ) external nonReentrant returns (address) {
        // Deploy new proxy
        address proxy = erc20VaultTokenImpl.clone();
        
        // Initialize the proxy
        ERC20VaultToken(proxy).initialize(
            name,
            symbol,
            underlying,
            feeConfig,
            msg.sender
        );
        
        // Register the asset
        _registerAsset(proxy, msg.sender, TokenType.ERC20, name, symbol);
        
        return proxy;
    }
    
    /**
     * @notice Create a new ERC721 Collateral NFT
     * @param name Name of the NFT collection
     * @param symbol Symbol of the NFT collection
     * @param baseURI Base URI for token metadata
     * @return Address of the deployed contract
     */
    function createERC721CollateralNFT(
        string memory name,
        string memory symbol,
        string memory baseURI
    ) external nonReentrant returns (address) {
        // Deploy new proxy
        address payable proxy = payable(erc721CollateralNFTImpl.clone());
        
        // Initialize the proxy
        ERC721CollateralNFT newNFT = ERC721CollateralNFT(proxy);
        newNFT.initialize(
            name,
            symbol,
            msg.sender,     // Owner
            baseURI,
            0,              // Initial minting fee (0%)
            feeRecipient    // Fee recipient
        );
        
        // Register the asset
        _registerAsset(address(proxy), msg.sender, TokenType.ERC721, name, symbol);
        
        return address(proxy);
    }
    
    /**
     * @notice Create a new ERC1155 Hybrid Asset
     * @param baseURI Base URI for token metadata
     * @return Address of the deployed contract
     */
    function createERC1155HybridAsset(
        string memory baseURI
    ) external nonReentrant returns (address) {
        // Deploy new proxy
        address payable proxy = payable(erc1155HybridAssetImpl.clone());
        
        // Initialize the proxy
        ERC1155HybridAsset newHybridAsset = ERC1155HybridAsset(proxy);
        newHybridAsset.initialize(
            baseURI,
            msg.sender,     // Owner
            0,              // Initial minting fee (0%)
            feeRecipient    // Fee recipient
        );
        
        // Register the asset
        _registerAsset(address(proxy), msg.sender, TokenType.ERC1155, "Hybrid Asset", "HYBRID");
        
        return address(proxy);
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Update template implementations
     * @param tokenType Type of token (0 = ERC20, 1 = ERC721, 2 = ERC1155)
     * @param newImplementation Address of the new implementation
     */
    function updateTemplate(
        TokenType tokenType,
        address newImplementation
    ) external onlyOwner {
        require(newImplementation != address(0), "Invalid implementation");
        
        if (tokenType == TokenType.ERC20) {
            erc20VaultTokenImpl = newImplementation;
        } else if (tokenType == TokenType.ERC721) {
            erc721CollateralNFTImpl = newImplementation;
        } else if (tokenType == TokenType.ERC1155) {
            erc1155HybridAssetImpl = newImplementation;
        } else {
            revert("Invalid token type");
        }
        
        emit TemplateUpdated(tokenType, newImplementation);
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
    
    // ============ View Functions ============
    
    /**
     * @notice Get the total number of deployed assets
     * @return Total number of assets
     */
    function getAssetCount() external view returns (uint256) {
        return allAssets.length;
    }
    
    /**
     * @notice Get a paginated list of assets
     * @param cursor Starting index
     * @param limit Maximum number of items to return
     * @return assets Array of asset addresses
     * @return nextCursor Next cursor for pagination
     */
    function getAssets(
        uint256 cursor,
        uint256 limit
    ) external view returns (address[] memory assets, uint256 nextCursor) {
        uint256 length = allAssets.length;
        
        if (cursor >= length) {
            return (new address[](0), 0);
        }
        
        uint256 end = cursor + limit;
        if (end > length) {
            end = length;
        }
        
        uint256 count = end - cursor;
        assets = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            assets[i] = allAssets[cursor + i];
        }
        
        nextCursor = end == length ? 0 : end;
    }
    
    /**
     * @notice Get assets created by a specific address
     * @param creator Address of the creator
     * @return Array of asset addresses
     */
    function getAssetsByCreator(
        address creator
    ) external view returns (address[] memory) {
        return creatorAssets[creator];
    }
    
    // ============ Internal Functions ============
    
    /**
     * @dev Register a new asset in the factory
     * @param assetAddress Address of the deployed asset
     * @param creator Address of the creator
     * @param tokenType Type of the token
     * @param name Name of the asset
     * @param symbol Symbol of the asset
     */
    function _registerAsset(
        address assetAddress,
        address creator,
        TokenType tokenType,
        string memory name,
        string memory symbol
    ) internal {
        // Create asset details
        Asset memory newAsset = Asset({
            assetAddress: assetAddress,
            creator: creator,
            tokenType: tokenType,
            name: name,
            symbol: symbol,
            createdAt: block.timestamp
        });
        
        // Store asset details
        assetDetails[assetAddress] = newAsset;
        allAssets.push(assetAddress);
        creatorAssets[creator].push(assetAddress);
        
        // Emit event
        emit AssetCreated(
            assetAddress,
            creator,
            tokenType,
            name,
            symbol,
            block.timestamp
        );
    }
}
