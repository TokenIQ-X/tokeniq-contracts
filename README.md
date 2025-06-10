# 🧠 TokenIQ Protocol Smart Contracts

TokenIQ is an AI-driven, B2B decentralized finance platform that helps businesses, DAOs, and funds convert idle capital and real-world assets into smart, productive, yield-bearing instruments.

This repository contains the core smart contracts that power TokenIQ, including the vault logic, yield strategies, tokenized asset layer, and Chainlink integrations.

---

## 🔗 Live for: Chainlink Fall Hackathon 2025

### 🚀 What Does TokenIQ Do?

- Turn idle treasury funds into **AI-optimized yield** via DeFi strategies
- Tokenize off-chain business assets like **invoices, equity, and receivables**
- Enable **cross-chain asset deployment** via Chainlink CCIP
- Offer transparency and safety using **Chainlink Proof of Reserve**, **Automation**, and **Data Streams**
- Integrate ElizaOS for **AI agents** that help rebalance portfolios, assess risk, and trigger actions

---

## 📁 Project Structure

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

