# 🧠 TokenIQ Protocol Smart Contracts

TokenIQ is an AI-driven, decentralized finance platform that helps businesses, DAOs, and funds convert idle capital and real-world assets into smart, productive, yield-bearing instruments.

## 📍 Network Deployments

### Core Testnet (Core Blockchain)

#### Contract Addresses

##### Token Templates
- **ERC20VaultToken**: [0xC310b4...E54](https://scan.test2.btcs.network/address/0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54)
- **ERC721CollateralNFT**: [0xc4d732...C7Ea](https://scan.test2.btcs.network/address/0xc4d732199B7d21207a74CFE6CEd4d17dD330C7Ea)
- **ERC1155HybridAsset**: [0xc9C0Fb...82b5](https://scan.test2.btcs.network/address/0xc9C0Fb76a50eAb570665977703cC8f7185c082b5)

##### Factory
- **AssetFactory**: [0x02406b...E168](https://scan.test2.btcs.network/address/0x02406b6d17E743deA7fBbfAE8A15c82e4481E168)
  - Implementation: [0x89C3FB...1f6F](https://scan.test2.btcs.network/address/0x89C3FBe736EDa478967Ac19Ca8634D3562881f6F)

### Sei Testnet

#### Contract Addresses

##### Token Templates
- **ERC20VaultToken**: [0xCaFF12...31A5](https://testnet.seistream.app/contracts/0xCaFF129Ec344A98Da8C9a4091a239DF158Cf31A5)
- **sWBTC (Wrapped BTC)**: [0xc9C0Fb...82b5](https://testnet.seistream.app/contracts/0xc9C0Fb76a50eAb570665977703cC8f7185c082b5)
- **ERC721CollateralNFT**: [0x8e827a...E6AF](https://testnet.seistream.app/contracts/0x8e827a12C78dED9459268eb05cce2C5d709FE6AF)
  - Implementation: [0x1a983C...1969F](https://testnet.seistream.app/contracts/0x1a983C4e0B9f57B5b34b6C753Ab13828ad21969F#code)
- **ERC1155HybridAsset**: [0xd6D6fB...8aC13](https://testnet.seistream.app/contracts/0xd6D6fBc6c0ebbB07411acB0EDad6373db389aC13)
  - Implementation: [0x9EFb11...579ce9](https://testnet.seistream.app/contracts/0x9EFb119c507CEa769b4277D6eC42274096579ce9#code)
- **AssetFactory**: [0x7b65E7...5c13](https://testnet.seistream.app/contracts/0x7b65E735F1b43102f672Dc04B6E33a424a955c13)
  - Implementation: [0xa2B398...6689](https://testnet.seistream.app/contracts/0xa2B39823120Ea8e7a1f2E3E6864596644eE96689#code)

## 🔍 Verification Commands

### Core Testnet
```bash
# ERC20VaultToken
npx hardhat verify --network coreTestnet2 0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54 "Vault Token Template" "VLT" 0x0000000000000000000000000000000000000000 "0" 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87

# ERC721CollateralNFT
npx hardhat verify --network coreTestnet2 0xc4d732199B7d21207a74CFE6CEd4d17dD330C7Ea "Collateral NFT" "CNFT" 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87 "https://api.tokeniq.xyz/nfts/" 0 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87

# ERC1155HybridAsset
npx hardhat verify --network coreTestnet2 0xc9C0Fb76a50eAb570665977703cC8f7185c082b5 "https://api.tokeniq.xyz/assets/" "0x60eF148485C2a5119fa52CA13c52E9fd98F28e87" 0 "0x60eF148485C2a5119fa52CA13c52E9fd98F28e87"

# AssetFactory
npx hardhat verify --network coreTestnet2 0x89C3FBe736EDa478967Ac19Ca8634D3562881f6F
```

### Sei Testnet
```bash
# ERC20VaultToken
npx hardhat verify --network seiTestnet 0xCaFF129Ec344A98Da8C9a4091a239DF158Cf31A5 "Vault Token Template" "VLT" 0x0000000000000000000000000000000000000000 "0" 0x0000000000000000000000000000000000000000

# sWBTC (Wrapped BTC)
npx hardhat verify --network seiTestnet 0xc9C0Fb76a50eAb570665977703cC8f7185c082b5 "SEI WRAPPED BITCOIN Token" "sWBTC" 18 1000000000000000000000000

# ERC721CollateralNFT Implementation
npx hardhat verify --network seiTestnet 0x1a983C4e0B9f57B5b34b6C753Ab13828ad21969F

# ERC721CollateralNFT Proxy
npx hardhat verify --network seiTestnet 0x8e827a12C78dED9459268eb05cce2C5d709FE6AF 0x1a983C4e0B9f57B5b34b6C753Ab13828ad21969F "0x" "Collateral NFT" "CNFT" 0x0000000000000000000000000000000000000000 "https://api.tokeniq.xyz/nfts/" 0 0x0000000000000000000000000000000000000000

# ERC1155HybridAsset Implementation
npx hardhat verify --network seiTestnet 0x9EFb119c507CEa769b4277D6eC42274096579ce9

# ERC1155HybridAsset Proxy
npx hardhat verify --network seiTestnet 0xd6D6fBc6c0ebbB07411acB0EDad6373db389aC13 0x9EFb119c507CEa769b4277D6eC42274096579ce9 "0x" "https://api.tokeniq.xyz/assets/" 0x0000000000000000000000000000000000000000 0 0x0000000000000000000000000000000000000000

# AssetFactory Implementation
npx hardhat verify --network seiTestnet 0xa2B39823120Ea8e7a1f2E3E6864596644eE96689

# AssetFactory Proxy
npx hardhat verify --network seiTestnet 0x7b65E735F1b43102f672Dc04B6E33a424a955c13 0xa2B39823120Ea8e7a1f2E3E6864596644eE96689 "0x" 0xCaFF129Ec344A98Da8C9a4091a239DF158Cf31A5 0x8e827a12C78dED9459268eb05cce2C5d709FE6AF 0xd6D6fBc6c0ebbB07411acB0EDad6373db389aC13 0x0000000000000000000000000000000000000000
```

### Sei Testnet
```bash
# ERC20VaultToken
npx hardhat verify --network seitestnet 0xCaFF129Ec344A98Da8C9a4091a239DF158Cf31A5 "Vault Token Template" "VLT" 0x0000000000000000000000000000000000000000 "0" 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87

# sWBTC
npx hardhat verify --network seitestnet 0xc9C0Fb76a50eAb570665977703cC8f7185c082b5

# ERC721CollateralNFT
npx hardhat verify --network seitestnet 0x8e827a12C78dED9459268eb05cce2C5d709FE6AF "Collateral NFT" "CNFT" 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87 "https://api.tokeniq.xyz/nfts/" 0 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87

# ERC1155HybridAsset
npx hardhat verify --network seitestnet 0xd6D6fBc6c0ebbB07411acB0EDad6373db389aC13 "https://api.tokeniq.xyz/assets/" "0x60eF148485C2a5119fa52CA13c52E9fd98F28e87" 0 "0x60eF148485C2a5119fa52CA13c52E9fd98F28e87"

# AssetFactory
npx hardhat verify --network seitestnet 0xa2B39823120Ea8e7a1f2E3E6864596644eE96689
```

## 🚀 Deployment

### Prerequisites
- Node.js 16+
- Hardhat
- Foundry (for some tests)

### Setup
```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test
```

### Deployment Scripts

#### Core Testnet
```bash
# Deploy templates
npx hardhat run scripts/deploy/templates.core.js --network coreTestnet2

# Deploy AssetFactory
npx hardhat run scripts/deploy/AssetFactory.core.js --network coreTestnet2
```

#### Sei Testnet
```bash
# 1. First deploy all template contracts
npx hardhat run scripts/deploy/templates.sei.js --network seiTestnet

# 2. Deploy sWBTC token (Wrapped Bitcoin)
npx hardhat run scripts/deploy/sWBTC.deploy.js --network seiTestnet

# 3. Deploy AssetFactory with template addresses
npx hardhat run scripts/factory.sei.js --network seiTestnet
```

### Verification After Deployment
After deployment, you can verify the contracts using the verification commands provided in the [Verification Commands](#-verification-commands) section above.

## 📚 Documentation

### Contract Architecture

#### Core Contracts
- **AssetFactory**: Factory contract for deploying token templates
- **ERC20VaultToken**: ERC20 wrapper for yield-bearing assets
- **ERC721CollateralNFT**: NFT representing collateral positions
- **ERC1155HybridAsset**: Multi-token standard for asset representation

#### Cross-chain (Sei Integration)
- **CrossChainRouter**: Handles cross-chain messaging and asset bridging
- **sWBTC**: Wrapped Bitcoin on Sei network

### Security
- All contracts are upgradeable using OpenZeppelin's UUPS pattern
- Pausable functionality for emergency stops
- Access control using OpenZeppelin's AccessControl

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 