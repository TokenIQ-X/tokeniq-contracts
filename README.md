# 🧠 TokenIQ Protocol Smart Contracts
TokenIQ is an AI-driven, decentralized finance platform that helps businesses, DAOs, and funds convert idle capital and real-world assets into smart, productive, yield-bearing instruments.

This repository contains the core smart contracts that power TokenIQ, including the vault logic, yield strategies, tokenized asset layer, and Chainlink integrations.

## 📍 Core Testnet Deployment

### Contract Addresses

#### Token Templates
- **ERC20VaultToken**: [0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54](https://scan.test2.btcs.network/address/0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54)
- **ERC721CollateralNFT**: [0xc4d732199B7d21207a74CFE6CEd4d17dD330C7Ea](https://scan.test2.btcs.network/address/0xc4d732199B7d21207a74CFE6CEd4d17dD330C7Ea)
- **ERC1155HybridAsset**: [0xc9C0Fb76a50eAb570665977703cC8f7185c082b5](https://scan.test2.btcs.network/address/0xc9C0Fb76a50eAb570665977703cC8f7185c082b5)

#### AssetFactory
- **Proxy**: [0x02406b6d17E743deA7fBbfAE8A15c82e4481E168](https://scan.test2.btcs.network/address/0x02406b6d17E743deA7fBbfAE8A15c82e4481E168)
- **Implementation**: [0x89C3FBe736EDa478967Ac19Ca8634D3562881f6F](https://scan.test2.btcs.network/address/0x89C3FBe736EDa478967Ac19Ca8634D3562881f6F)

### Verification Commands

To verify the contracts on Core Testnet, run:

```bash
# Verify ERC20VaultToken
npx hardhat verify --network coreTestnet2 0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54 "Vault Token Template" "VLT" 0x0000000000000000000000000000000000000000 "0" 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87

# Verify ERC721CollateralNFT
npx hardhat verify --network coreTestnet2 0xc4d732199B7d21207a74CFE6CEd4d17dD330C7Ea "Collateral NFT" "CNFT" 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87 "https://api.tokeniq.xyz/nfts/" 0 0x60eF148485C2a5119fa52CA13c52E9fd98F28e87

# Verify ERC1155HybridAsset
npx hardhat verify --network coreTestnet2 0xc9C0Fb76a50eAb570665977703cC8f7185c082b5 "https://api.tokeniq.xyz/assets/" "0x60eF148485C2a5119fa52CA13c52E9fd98F28e87" 0 "0x60eF148485C2a5119fa52CA13c52E9fd98F28e87"

# Verify AssetFactory Implementation
npx hardhat verify --network coreTestnet2 0x89C3FBe736EDa478967Ac19Ca8634D3562881f6F
```

### Deployment Scripts

- Deploy templates: `npx hardhat run scripts/deploy/DeployTemplates.coreTestnet.js --network coreTestnet2`
- Deploy AssetFactory: `npx hardhat run scripts/deploy/DeployAssetFactory.coreTestnet.js --network coreTestnet2`

## 🔌 Frontend Integration Guide

### Prerequisites
```bash
npm install ethers @web3-react/core @web3-react/injected-connector
```

### Initializing Web3 Provider
```javascript
import { ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import { InjectedConnector } from '@web3-react/injected-connector';

export const injected = new InjectedConnector({
  supportedChainIds: [1115] // Core Testnet chain ID
});

// Initialize provider
const getLibrary = (provider) => {
  return new Web3Provider(provider);
};
```

### Interacting with AssetFactory
```javascript
import { Contract } from 'ethers';
import AssetFactoryABI from './abis/AssetFactory.json';

const ASSET_FACTORY_ADDRESS = '0x02406b6d17E743deA7fBbfAE8A15c82e4481E168';

// Create contract instance
const assetFactory = new Contract(
  ASSET_FACTORY_ADDRESS,
  AssetFactoryABI,
  provider.getSigner()
);

// Create a new ERC20 Vault Token
const createVaultToken = async (name, symbol, underlying) => {
  const tx = await assetFactory.createERC20VaultToken(
    name,
    symbol,
    underlying,
    10,    // 0.1% deposit fee
    5,     // 0.05% withdrawal fee
    200    // 2% performance fee
  );
  return tx.wait();
};

// Get all assets created by an address
const getUserAssets = async (address) => {
  return await assetFactory.getAssetsByCreator(address);
};
```

### Interacting with Deployed Tokens
```javascript
// ERC20VaultToken ABI
const ERC20VaultTokenABI = [
  'function deposit(uint256 assets, address receiver) returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function totalAssets() view returns (uint256)'
];

// Deposit into vault
const depositToVault = async (vaultAddress, amount) => {
  const vault = new Contract(vaultAddress, ERC20VaultTokenABI, provider.getSigner());
  const tx = await vault.deposit(amount, await signer.getAddress());
  return tx.wait();
};

// Get vault balance
const getVaultBalance = async (vaultAddress, userAddress) => {
  const vault = new Contract(vaultAddress, ERC20VaultTokenABI, provider);
  return await vault.balanceOf(userAddress);
};
```

### Listening to Events
```javascript
// Listen for new asset creation
assetFactory.on('AssetCreated', (assetAddress, creator, tokenType, name, symbol, event) => {
  console.log(`New ${tokenType} created:`, { assetAddress, creator, name, symbol });
});

// Listen for deposits
const vault = new Contract(vaultAddress, ERC20VaultTokenABI, provider);
vault.on('Deposit', (sender, owner, assets, shares, event) => {
  console.log('Deposit event:', { sender, owner, assets: assets.toString(), shares: shares.toString() });
});
```

### Error Handling
```javascript
try {
  const tx = await depositToVault(vaultAddress, amount);
  console.log('Transaction successful:', tx.transactionHash);
} catch (error) {
  console.error('Transaction failed:', error);
  if (error.code === 4001) {
    console.log('User rejected the transaction');
  } else if (error.code === -32603) {
    console.log('Insufficient funds or gas');
  }
}
```

### Best Practices
1. Always validate user input and contract state before sending transactions
2. Use proper error boundaries in your React components
3. Cache contract instances and ABIs where possible
4. Implement loading states for all async operations
5. Use proper type checking with TypeScript for better developer experience

### Example React Hook
```javascript
import { useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';

export function useVaultBalance(vaultAddress) {
  const { library, account } = useWeb3React();
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!library || !account) return;
      
      const vault = new Contract(vaultAddress, ERC20VaultTokenABI, library);
      const userBalance = await vault.balanceOf(account);
      setBalance(ethers.utils.formatUnits(userBalance, 8)); // 8 decimals for WBTC
      setLoading(false);
    };

    fetchBalance();
    
    // Listen for transfer events
    const onTransfer = (from, to, value) => {
      if (from === account || to === account) {
        fetchBalance();
      }
    };
    
    vault.on('Transfer', onTransfer);
    return () => {
      vault.off('Transfer', onTransfer);
    };
  }, [library, account, vaultAddress]);

  return { balance, loading };
}
```

---

## 🔗 Live for: Chainlink Fall Hackathon 2025

### 🚀 What Does TokenIQ Do?

- Turn idle treasury funds into **AI-optimized yield** via DeFi strategies
- Tokenize off-chain business assets like **invoices, equity, and receivables**
- Enable **cross-chain asset deployment** via Chainlink CCIP
- Offer transparency and safety using **Chainlink Proof of Reserve**, **Automation**, and **Data Streams**
- Integrate ElizaOS for **AI agents** that help rebalance portfolios, assess risk, and trigger actions

---

## 📊 Simulation

To run a local simulation of TokenIQ's trade finance capabilities, follow these steps:

1. **Install Dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Run the Simulation**:
   ```bash
   ./run_simulation.sh
   ```
   This will:
   - Start a local Hardhat node
   - Deploy the necessary contracts
   - Execute the trade finance simulation
   - Display the results in your terminal

3. **View the Simulation Output**:
   The script will show you a step-by-step simulation of how TokenIQ transforms traditional trade finance, including:
   - Invoice tokenization
   - Cross-chain capital deployment
   - AI-driven treasury management
   - Yield generation and distribution

   The node will automatically shut down when the simulation completes.

> 💡 **Note**: Make sure you have Node.js (v16+) and npm installed on your system.


## Deployed contracts 

### AaveVault 
- Ethereum Sepolia 
    - [0xB791Be1D932397e3eFa757C8d4B9F6BAC86F1Ca1](https://sepolia.etherscan.io/address/0xB791Be1D932397e3eFa757C8d4B9F6BAC86F1Ca1#code)
- Avalanche Fuji
    - [0x16A54CdEcf7e051084B3CfEC169249e170121A8B](https://testnet.snowtrace.io/address/0x16A54CdEcf7e051084B3CfEC169249e170121A8B#code)

### CrossChainRouter
- Ethereum Sepolia
    - [0xD1d6EE0c5309A09Df9ca4c2936956A49cca9eb71](https://sepolia.etherscan.io/address/0xD1d6EE0c5309A09Df9ca4c2936956A49cca9eb71#code)
- Avalanche Fuji
    - [0x9EFb119c507CEa769b4277D6eC42274096579ce9](https://testnet.snowtrace.io/address/0x9EFb119c507CEa769b4277D6eC42274096579ce9#code)
- Base Sepolia
    - [0x7CC324d15E5fF17c43188fB63b462B9a79dA68f6](https://sepolia.basescan.org/address/0x7CC324d15E5fF17c43188fB63b462B9a79dA68f6#code)

## 📁 Project Structure
```
contracts/
│
├── VaultManager.sol # Main user deposit, vault, and yield routing logic
├── VaultFactory.sol # Deploys StrategyVaults modularly
│
├── strategies/ # Yield-generating vault strategies
│ ├── AaveVault.sol
│ ├── CurveVault.sol
│ └── RWAInvoiceVault.sol
│
├── rwa/ # Tokenized Real World Asset contracts
│ ├── TokenizedInvoice.sol # ERC721 token for invoice representation
│ └── InvoiceRegistry.sol # Stores metadata, valuation, status
│
├── ai/ # AI agent configuration (ElizaOS or off-chain trigger)
│ └── TreasuryAIManager.sol
│
├── crosschain/ # Chainlink CCIP and message router
│ └── CrossChainRouter.sol
│
└── governance/ # Optional governance and reward token logic
└── TokenIQToken.sol
```
---

## 🧠 Core Contracts

### 1. `VaultManager.sol`

- Handles all treasury deposits/withdrawals
- Tracks user balances and vault shares
- Interfaces with individual strategy vaults
- Integrates with Chainlink Automation for rebalancing

### 2. `StrategyVault.sol` (Modular)

Each vault integrates with a DeFi protocol to optimize yield:
- Aave, Curve, Yearn, etc.
- RWA-based lending strategies

### 3. `TokenizedInvoice.sol`

- ERC-721 token representing a real-world invoice
- Supports fractionalization (optional)
- Metadata: issuer, amount, due date, verification, etc.

### 4. `CrossChainRouter.sol`

- Uses Chainlink CCIP to move tokenized assets and vaults cross-chain
- Receives messages and routes them to correct vaults

### 5. `TreasuryAIManager.sol`

- Acts as a data store/interface for AI agents (e.g., ElizaOS)
- Stores AI decisions for rebalancing, fund allocation, or sentiment insights
- Can be triggered via Chainlink Functions/Data Streams

---

## 💰 Understanding TokenIQ Strategies

### What is a Strategy in TokenIQ?

In TokenIQ, a strategy is simply a way to make money with idle funds by putting them into something that earns interest — like how a traditional bank uses your deposits to give loans and pays you interest.

But instead of banks, we use DeFi protocols — decentralized financial platforms that operate with smart contracts (automated code on the blockchain).

### 💸 What is Aave, and why use it?

Aave is one of the most trusted DeFi lending protocols. It lets you:

- Deposit stablecoins like USDC, DAI, or USDT
- Earn interest automatically because others borrow from that pool
- Withdraw your funds at any time (usually, unless it's locked)

We choose Aave as a strategy because:

✅ It's secure and audited
✅ It supports many stablecoins
✅ It's widely adopted and battle-tested
✅ It offers decent, stable yields
✅ It's non-custodial — meaning Aave doesn't hold your money, the protocol does

### 📊 Example in Layman Terms:

Imagine TokenIQ has $100,000 of idle funds from a business.

Instead of letting that money sit in a wallet doing nothing:

1. TokenIQ smart contract deposits $100k into Aave
2. Aave starts lending it out to people who put up crypto collateral
3. TokenIQ starts earning 4%–10% APY (annual interest), auto-compounding
4. When the business wants to withdraw, TokenIQ pulls funds from Aave instantly

### 🧩 Available Strategies

We can diversify funds across multiple DeFi strategies to optimize yield and reduce risk:

| Protocol | What It Does | TokenIQ Strategy |
|----------|-------------|------------------|
| Aave | Lending/borrowing | Yield strategy vault |
| Compound | Lending like Aave | Backup yield vault |
| Yearn Finance | Auto-optimizes between protocols | Smart aggregator |
| Curve | Stablecoin swaps and LP earnings | DEX + yield |
| Convex | Boosts Curve earnings | High-yield route |
| Goldfinch | Real-world loans (emerging markets) | RWA pool strategy |
| Maple Finance | Loans to crypto institutions | RWA or DAO-based loans |
| Centrifuge | Tokenizes invoices and assets (RWA) | Invoice strategy vault |

We wrap these protocols in our own modular StrategyVault contracts, so TokenIQ can:

- Plug in new strategies any time
- Rebalance between them
- Make decisions using AI (e.g., switch from Aave to Curve if yield is better)

### 🔁 Strategy Flow Simplified

```
User or DAO → deposits $ → TokenIQ Vault
                          → Vault splits $ between strategies (e.g., Aave, Curve)
                             → Each strategy earns yield
                                → AI monitors and rebalances
                                   → Withdraw anytime with earnings
```

### 🔒 Security Considerations

These strategies are relatively safe but not risk-free. That's why:

- We use Chainlink Oracles to monitor protocol health (e.g., Aave collapse)
- Use Proof of Reserves to ensure backing
- AI/Chainlink Automation triggers emergency withdrawals or rebalances if needed

---

## 🔗 Chainlink Integrations

| Feature | Integration | Description |
|--------|-------------|-------------|
| Cross-chain strategy deployment | Chainlink CCIP | Move assets & messages securely across chains |
| APY, market data, FX rates | Chainlink Data Feeds | Drive yield decisions and collateral valuations |
| Sentiment/Off-chain triggers | Chainlink Functions + ElizaOS | AI or off-chain data for smart allocation |
| Rebalancing & strategy updates | Chainlink Automation | Keep strategies aligned with AI models |
| Asset audits and transparency | Chainlink Proof of Reserve | Show on-chain proof for RWA-backed tokens |

---

## 🧪 Usage Scenarios
| Scenario	| Contract Involved |
|----------|-------------|
| Treasury deposits and yield routing	| VaultManager.sol |
| Auto-rebalance on yield change	| StrategyVault.sol + Chainlink Automation |
| Tokenize and fractionalize invoices	| TokenizedInvoice.sol |
| Move assets to another chain	| CrossChainRouter.sol |
| Store AI-based strategy signals	| TreasuryAIManager.sol |

💡 Example Use Case
Company X has $1M idle USDC in their treasury. They:

Deposit it into TokenIQ via VaultManager

TokenIQ AI assigns the capital to Aave, Curve, and a tokenized invoice pool

Chainlink Automation rebalances based on yield updates

Chainlink Data Feeds verify the health of each protocol

They gain 8–12% APY automatically, non-custodially

📌 Future Improvements
NFT-backed invoice trading marketplace

ERC-3643 compliance for real-world assets

DAO-based treasury strategy voting

Integration with on-chain credit scores or reputation oracles

