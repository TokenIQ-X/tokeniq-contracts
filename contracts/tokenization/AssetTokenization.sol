// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title AssetTokenization
 * @notice Contract for tokenizing real-world assets as NFTs with optional collateralization
 */
contract AssetTokenization is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Token counter
    Counters.Counter private _tokenIdCounter;
    
    // Asset details
    struct Asset {
        uint256 tokenId;
        address creator;
        string assetType;  // e.g., "INVOICE", "CARBON_CREDIT", "REAL_ESTATE"
        uint256 value;     // Value in wei or smallest unit
        address paymentToken; // Address of the ERC20 token used for payment (address(0) for native token)
        bool isCollateralized;
        bool isRedeemed;
        string metadataURI;
    }
    
    // Mapping from token ID to Asset
    mapping(uint256 => Asset) public assets;
    
    // Mapping from token ID to collateral amount
    mapping(uint256 => uint256) public collateralAmounts;
    
    // Mapping from token ID to collateral token address
    mapping(uint256 => address) public collateralTokens;
    
    // Mapping from token ID to approved collateral token address
    mapping(uint256 => address) public approvedCollateralTokens;
    
    // Events
    event AssetTokenized(
        uint256 indexed tokenId,
        address indexed creator,
        string assetType,
        uint256 value,
        string metadataURI
    );
    
    event AssetCollateralized(
        uint256 indexed tokenId,
        address indexed collateralizer,
        address collateralToken,
        uint256 amount
    );
    
    event AssetRedeemed(
        uint256 indexed tokenId,
        address indexed redeemer,
        address paymentToken,
        uint256 amount
    );
    
    event CollateralReleased(
        uint256 indexed tokenId,
        address indexed receiver,
        address collateralToken,
        uint256 amount
    );
    
    /**
     * @dev Constructor
     * @param name Name of the NFT collection
     * @param symbol Symbol of the NFT collection
     */
    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}
    
    /**
     * @notice Tokenize a new asset
     * @param assetType Type of the asset (e.g., "INVOICE", "CARBON_CREDIT")
     * @param value Value of the asset in wei or smallest unit
     * @param paymentToken Address of the ERC20 token for payment (address(0) for native token)
     * @param metadataURI URI pointing to the asset's metadata
     * @return tokenId The ID of the newly minted token
     */
    function tokenizeAsset(
        string memory assetType,
        uint256 value,
        address paymentToken,
        string memory metadataURI
    ) external returns (uint256) {
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        // Mint NFT to the creator
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);
        
        // Store asset details
        assets[tokenId] = Asset({
            tokenId: tokenId,
            creator: msg.sender,
            assetType: assetType,
            value: value,
            paymentToken: paymentToken,
            isCollateralized: false,
            isRedeemed: false,
            metadataURI: metadataURI
        });
        
        emit AssetTokenized(tokenId, msg.sender, assetType, value, metadataURI);
        
        return tokenId;
    }
    
    /**
     * @notice Collateralize an asset with ERC20 tokens
     * @param tokenId ID of the tokenized asset
     * @param collateralToken Address of the ERC20 token used as collateral
     * @param amount Amount of collateral tokens to lock
     */
    function collateralizeAsset(
        uint256 tokenId,
        address collateralToken,
        uint256 amount
    ) external nonReentrant {
        require(_exists(tokenId), "Asset does not exist");
        require(!assets[tokenId].isCollateralized, "Asset already collateralized");
        require(amount > 0, "Collateral amount must be greater than 0");
        
        // If this is the first time collateralizing, set the approved token
        if (collateralAmounts[tokenId] == 0) {
            approvedCollateralTokens[tokenId] = collateralToken;
        } else {
            require(
                collateralToken == approvedCollateralTokens[tokenId],
                "Must use the same collateral token"
            );
        }
        
        // Transfer collateral tokens from sender to this contract
        IERC20(collateralToken).transferFrom(msg.sender, address(this), amount);
        
        // Update collateral amount
        collateralAmounts[tokenId] += amount;
        collateralTokens[tokenId] = collateralToken;
        assets[tokenId].isCollateralized = true;
        
        emit AssetCollateralized(tokenId, msg.sender, collateralToken, amount);
    }
    
    /**
     * @notice Redeem an asset by paying its value
     * @param tokenId ID of the tokenized asset to redeem
     */
    function redeemAsset(uint256 tokenId) external payable nonReentrant {
        require(_exists(tokenId), "Asset does not exist");
        require(!assets[tokenId].isRedeemed, "Asset already redeemed");
        
        Asset storage asset = assets[tokenId];
        
        if (asset.paymentToken == address(0)) {
            // Native token payment
            require(msg.value >= asset.value, "Insufficient payment");
            
            // Transfer payment to the creator
            (bool sent, ) = payable(asset.creator).call{value: asset.value}("");
            require(sent, "Failed to send payment");
            
            // Return excess payment
            if (msg.value > asset.value) {
                (sent, ) = payable(msg.sender).call{value: msg.value - asset.value}("");
                require(sent, "Failed to return excess payment");
            }
        } else {
            // ERC20 token payment
            IERC20 paymentToken = IERC20(asset.paymentToken);
            require(
                paymentToken.transferFrom(msg.sender, asset.creator, asset.value),
                "Payment transfer failed"
            );
        }
        
        // Transfer NFT to the redeemer
        _transfer(ownerOf(tokenId), msg.sender, tokenId);
        
        // Mark as redeemed
        asset.isRedeemed = true;
        
        emit AssetRedeemed(tokenId, msg.sender, asset.paymentToken, asset.value);
    }
    
    /**
     * @notice Release collateral for an asset (only callable by the NFT owner)
     * @param tokenId ID of the tokenized asset
     */
    function releaseCollateral(uint256 tokenId) external nonReentrant {
        require(ownerOf(tokenId) == msg.sender, "Not the asset owner");
        require(assets[tokenId].isCollateralized, "Asset not collateralized");
        
        address collateralToken = collateralTokens[tokenId];
        uint256 amount = collateralAmounts[tokenId];
        
        // Reset collateral state
        delete collateralAmounts[tokenId];
        delete collateralTokens[tokenId];
        assets[tokenId].isCollateralized = false;
        
        // Transfer collateral back to the owner
        IERC20(collateralToken).transfer(msg.sender, amount);
        
        emit CollateralReleased(tokenId, msg.sender, collateralToken, amount);
    }
    
    /**
     * @notice Get asset details by token ID
     * @param tokenId ID of the tokenized asset
     * @return Asset details
     */
    function getAsset(uint256 tokenId) external view returns (Asset memory) {
        require(_exists(tokenId), "Asset does not exist");
        return assets[tokenId];
    }
    
    /**
     * @notice Check if an asset is fully collateralized
     * @param tokenId ID of the tokenized asset
     * @return bool True if the asset is fully collateralized
     */
    function isFullyCollateralized(uint256 tokenId) external view returns (bool) {
        require(_exists(tokenId), "Asset does not exist");
        return collateralAmounts[tokenId] >= assets[tokenId].value;
    }
    
    // Override required by Solidity
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    // Override required by Solidity
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    // Override transfer to prevent transfer of collateralized assets
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Allow minting and burning
        if (from == address(0) || to == address(0)) {
            return;
        }
        
        // Prevent transfer of collateralized assets
        require(!assets[tokenId].isCollateralized, "Cannot transfer collateralized asset");
    }
}
