# TokenIQ Core Implementation

## Core Contracts

### 1. AssetFactory
**Address**: `0x02406b6d17E743deA7fBbfAE8A15c82e4481E168` (Proxy)
**Implementation**: `0x89C3FBe736EDa478967Ac19Ca8634D3562881f6F`

**Key Functions**:
```solidity
// Create new token instances
function createERC20VaultToken(
    string memory name,
    string memory symbol,
    address underlying,
    uint256 depositFeeBasisPoints,
    uint256 withdrawalFeeBasisPoints,
    uint256 performanceFeeBasisPoints
) external returns (address)

function createERC721CollateralNFT(
    string memory name,
    string memory symbol,
    string memory baseURI
) external returns (address)

function createERC1155HybridAsset(
    string memory baseURI
) external returns (address)

// Query functions
function getAssetsByCreator(address creator) external view returns (address[] memory)
function getAssetCount() external view returns (uint256)
function assetDetails(address) external view returns (Asset memory)
```

**Events**:
```solidity
event AssetCreated(
    address indexed assetAddress,
    address indexed creator,
    TokenType tokenType,  // ERC20, ERC721, ERC1155
    string name,
    string symbol,
    uint256 timestamp
);

event TemplateUpdated(TokenType tokenType, address newImplementation);
```

### 2. ERC20VaultToken
**Template Address**: `0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54`

**Key Features**:
- ERC20 with fee-on-transfer functionality
- Configurable fees for deposit/withdrawal
- Underlying asset tracking

**Key Functions**:
```solidity
function deposit(uint256 assets, address receiver) external returns (uint256)
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)
function totalAssets() external view returns (uint256)
function convertToShares(uint256 assets) external view returns (uint256)
function convertToAssets(uint256 shares) external view returns (uint256)
```

### 3. ERC721CollateralNFT
**Template Address**: `0xc4d732199B7d21207a74CFE6CEd4d17dD330C7Ea`

**Key Features**:
- ERC721 with metadata support
- Collateral management
- Royalty support

**Key Functions**:
```solidity
function mint(address to, string memory tokenURI) external returns (uint256)
function setBaseURI(string memory baseURI) external
function setTokenURI(uint256 tokenId, string memory tokenURI) external
```

### 4. ERC1155HybridAsset
**Template Address**: `0xc9C0Fb76a50eAb570665977703cC8f7185c082b5`

**Key Features**:
- Hybrid ERC1155 implementation
- Batch operations
- URI management

**Key Functions**:
```solidity
function mint(address to, uint256 id, uint256 amount, bytes memory data) external
function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) external
function setURI(string memory newuri) external
```

### 5. LSTBTCVault
**Functions**:
```solidity
function deposit(uint256 assets, address receiver) external returns (uint256)
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)
function balanceOf(address account) external view returns (uint256)
function totalAssets() external view returns (uint256)
function updateStrategy(address newStrategy) external
```

## Frontend Integration

```javascript
// Initialize Web3
import { ethers } from 'ethers';
const provider = new ethers.providers.Web3Provider(window.ethereum);

// Connect to AssetFactory
const AssetFactoryABI = [/* ABI */];
const factory = new ethers.Contract(
  '0x02406b6d17E743deA7fBbfAE8A15c82e4481E168',
  AssetFactoryABI,
  provider.getSigner()
);

// Example: Create ERC20 Vault Token
async function createVaultToken(name, symbol) {
  const tx = await factory.createERC20VaultToken(
    name,
    symbol,
    '0x...', // underlying token
    10,      // deposit fee (0.1%)
    5,       // withdrawal fee (0.05%)
    200      // performance fee (2%)
  );
  return tx.wait();
}
```

## Error Handling
```javascript
try {
  await contract.deposit(amount);
} catch (error) {
  if (error.code === 4001) {
    console.log('User rejected transaction');
  } else {
    console.error('Transaction failed:', error);
  }
}
```

## Events
```javascript
// Listen for new assets
factory.on('AssetCreated', (assetAddress, creator, tokenType) => {
  console.log('New asset:', { assetAddress, creator, tokenType });
});
```
