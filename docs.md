# TokenIQ Smart Contracts Documentation

## Overview
TokenIQ is a DeFi protocol that provides AI-driven treasury management and cross-chain capabilities. The protocol consists of several key components:

1. TreasuryAIManager - AI-driven treasury management
2. CrossChainRouter - Cross-chain token transfers using Chainlink CCIP
3. AaveVault - Aave V3 integration for yield generation

## Contract Architecture

### TreasuryAIManager
The TreasuryAIManager contract is responsible for making AI-driven decisions about treasury management. It integrates with Chainlink Automation for periodic updates and Chainlink Price Feeds for market data.

#### Key Features
- AI-driven strategy decisions
- Market data tracking
- Automated rebalancing
- Service layer integration

#### State Variables
```solidity
mapping(address => StrategyDecision[]) public strategyDecisions;
mapping(address => MarketData) public marketData;
mapping(address => bool) public supportedStrategies;
mapping(bytes32 => bool) public processedDecisions;
mapping(address => AggregatorV3Interface) public priceFeeds;
```

#### Main Functions
- `setServiceLayer(address _serviceLayer, bool _isActive)`: Configure the TypeScript service layer
- `checkUpkeep(bytes calldata)`: Chainlink Automation check function
- `performUpkeep(bytes calldata)`: Chainlink Automation execution function
- `processDecision(bytes32 decisionId, uint256 allocation, string reason)`: Process AI decisions
- `setSupportedStrategy(address strategy, bool supported)`: Manage supported strategies

### CrossChainRouter
The CrossChainRouter contract enables cross-chain token transfers using Chainlink's Cross-Chain Interoperability Protocol (CCIP).

#### Key Features
- Cross-chain token transfers
- Chain and token allowlisting
- Fee management
- Message tracking

#### State Variables
```solidity
IRouterClient public immutable router;
LinkTokenInterface public immutable linkToken;
mapping(uint64 => bool) public supportedChains;
mapping(address => bool) public supportedTokens;
mapping(bytes32 => bool) public processedMessages;
```

#### Main Functions
- `sendTokens(uint64 destinationChainSelector, address token, uint256 amount)`: Send tokens to another chain
- `_ccipReceive(Client.Any2EVMMessage memory message)`: Handle incoming CCIP messages
- `setSupportedChain(uint64 chainSelector, bool supported)`: Manage supported chains
- `setSupportedToken(address token, bool supported)`: Manage supported tokens

### AaveVault
The AaveVault contract integrates with Aave V3 for yield generation and asset management.

#### Key Features
- Aave V3 integration
- Automated rebalancing
- Price feed integration
- Emergency withdrawal

#### State Variables
```solidity
IPool public immutable POOL;
address public immutable UNDERLYING_TOKEN;
address public immutable ATOKEN;
uint256 public targetAllocation;
uint256 public lastRebalance;
```

#### Main Functions
- `deposit(uint256 amount)`: Deposit tokens into Aave
- `withdraw(uint256 amount)`: Withdraw tokens from Aave
- `rebalance()`: Rebalance the strategy
- `setTargetAllocation(uint256 _targetAllocation)`: Set target allocation
- `emergencyWithdraw()`: Emergency withdrawal of all funds

## Security Features

### Access Control
- All contracts use OpenZeppelin's Ownable for access control
- Critical functions are restricted to owner
- ReentrancyGuard protection on sensitive functions

### Validation
- Input validation for all parameters
- Chain and token allowlisting
- Amount validation
- Balance checks

### Emergency Functions
- Emergency withdrawal capabilities
- Pausable functionality where applicable
- Owner-only administrative functions

## Integration Points

### Chainlink Integration
- Chainlink Automation for periodic updates
- Chainlink Price Feeds for market data
- Chainlink CCIP for cross-chain operations

### Aave Integration
- Aave V3 Pool for lending
- Aave ATokens for yield generation
- Aave price feeds for asset pricing

## Testing

### Test Coverage
- Unit tests for all contracts
- Integration tests for cross-chain operations
- Mock contracts for external dependencies

### Test Categories
1. Deployment tests
2. Functionality tests
3. Access control tests
4. Edge case tests
5. Integration tests

## Deployment

### Prerequisites
- Hardhat development environment
- Node.js and npm
- Access to testnet/mainnet

### Environment Variables
```env
PRIVATE_KEY=your_private_key
INFURA_API_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### Deployment Steps
1. Install dependencies:
```bash
npm install
```

2. Compile contracts:
```bash
npx hardhat compile
```

3. Run tests:
```bash
npx hardhat test
```

4. Deploy to network:
```bash
npx hardhat run scripts/deploy.js --network <network>
```

## Maintenance

### Monitoring
- Monitor Chainlink Automation jobs
- Track cross-chain message status
- Monitor Aave positions
- Track treasury performance

### Upgrades
- Use upgradeable patterns where applicable
- Follow security best practices
- Test thoroughly before deployment

## Best Practices

### Development
- Follow Solidity style guide
- Use latest compiler version
- Implement comprehensive testing
- Document all functions

### Security
- Regular security audits
- Follow security best practices
- Monitor for vulnerabilities
- Keep dependencies updated

### Gas Optimization
- Optimize storage usage
- Use appropriate data types
- Batch operations where possible
- Minimize external calls

## License
MIT License

## Contact
For support or questions, please contact the development team. 