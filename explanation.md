# TokenIQ Smart Contracts Documentation

## Overview
TokenIQ is a DeFi protocol that enables liquid staking of WBTC through a system of vaults and strategies. The system is designed to be modular, allowing for different staking strategies while maintaining a consistent interface for users.

## Core Contracts

### 1. LSTBTCVault
**Purpose**: ERC-4626 compliant vault that issues LSTBTC tokens in exchange for staked WBTC.

**Key Features**:
- Implements ERC-4626 standard for tokenized vaults
- Mints/burns LSTBTC (Liquid Staked BTC) tokens 1:1 with WBTC
- Integrates with staking strategies through the IStakingStrategy interface
- Includes emergency withdrawal functionality
- Pausable for security

**Main Functions**:
- `deposit()`: Stake WBTC and mint LSTBTC
- `withdraw()`: Burn LSTBTC and unstake WBTC
- `updateStrategy()`: Change the staking strategy (owner only)
- `emergencyWithdraw()`: Withdraw all funds in case of emergency

### 2. AaveStrategy
**Purpose**: Implements staking strategy using Aave V3 to earn yield on WBTC.

**Key Features**:
- Deposits WBTC into Aave V3 to earn interest
- Implements IStakingStrategy interface
- Handles aWBTC (Aave's interest-bearing WBTC)
- Includes emergency withdrawal functionality

**Main Functions**:
- `stake()`: Deposit WBTC into Aave
- `unstake()`: Withdraw WBTC from Aave
- `getAPY()`: Returns the current APY (currently returns fixed 3% for testing)
- `harvest()`: Claims and reinvests rewards

### 3. VaultFactory
**Purpose**: Factory contract for creating and managing different types of vaults.

**Key Features**:
- Creates new vault instances using the clone pattern
- Manages vault implementations for different types (Aave, Curve, RWA, BTCfi)
- Tracks all created vaults

**Main Functions**:
- `createVault()`: Deploys a new vault
- `setVaultImplementation()`: Registers a new vault implementation
- `getVaultsByType()`: Returns all vaults of a specific type

### 4. VaultManager
**Purpose**: Manages user deposits, withdrawals, and strategy allocations.

**Key Features**:
- Handles user shares and assets
- Implements rebalancing logic
- Integrates with Chainlink Automation
- Tracks vault performance

**Main Functions**:
- `deposit()`: Deposit assets into a vault
- `withdraw()`: Withdraw assets from a vault
- `rebalance()`: Rebalance assets across strategies

## Supporting Contracts

### 1. IStakingStrategy (Interface)
Defines the standard interface that all staking strategies must implement, ensuring compatibility with the LSTBTCVault.

### 2. TreasuryAIManager
Manages automated strategies and risk parameters for the protocol.

### 3. Mock Contracts
- `AavePoolMock`: Simulates Aave Pool for testing
- `RewardsControllerMock`: Simulates Aave rewards
- `ERC20Mock`: Mock ERC20 token for testing

## Workflow

### Staking WBTC
1. User calls `LSTBTCVault.deposit()` with WBTC
2. Vault transfers WBTC from user
3. Vault calls `strategy.stake()` to deposit WBTC into Aave
4. Vault mints LSTBTC tokens to user

### Unstaking WBTC
1. User calls `LSTBTCVault.withdraw()` with LSTBTC amount
2. Vault burns LSTBTC tokens
3. Vault calls `strategy.unstake()` to withdraw WBTC from Aave
4. Vault transfers WBTC to user

### Strategy Management
1. Protocol admin can update strategies using `updateStrategy()`
2. In emergency, admin can pause deposits/withdrawals
3. Vault tracks total staked amount separately from contract balance

## Security Considerations
- Uses OpenZeppelin's ReentrancyGuard
- Implements proper access control with Ownable
- Includes emergency withdrawal functionality
- Uses SafeERC20 for safe token transfers
- Pausable for critical functions

## Testing
Comprehensive test suite includes:
- Vault deployment and configuration
- Deposit/withdrawal flows
- Strategy integration
- Edge cases and security scenarios

## Future Improvements
1. Implement dynamic APY calculation for Aave V3
2. Add more staking strategies (Curve, Yearn, etc.)
3. Implement fee structure
4. Add governance functionality
5. Improve gas efficiency for frequent operations

## Deployment
1. Deploy implementation contracts
2. Deploy VaultFactory
3. Register vault implementations with VaultFactory
4. Deploy LSTBTCVault with initial strategy
5. Transfer ownership to governance

## Audit Status
- Code is under development
- Basic testing completed
- Security review pending

## License
MIT License - See LICENSE file for details.
