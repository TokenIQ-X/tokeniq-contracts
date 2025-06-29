# TokenIQ Frontend Integration Guide

This document provides a guide for frontend developers to interact with the TokenIQ smart contracts. It outlines the purpose of each contract, their functions, and how to call them.

## Deployed Contracts

### AaveVault
- **Ethereum Sepolia:** [0xB791Be1D932397e3eFa757C8d4B9F6BAC86F1Ca1](https://sepolia.etherscan.io/address/0xB791Be1D932397e3eFa757C8d4B9F6BAC86F1Ca1#code)
- **Avalanche Fuji:** [0x16A54CdEcf7e051084B3CfEC169249e170121A8B](https://testnet.snowtrace.io/address/0x16A54CdEcf7e051084B3CfEC169249e170121A8B#code)

### CrossChainRouter
- **Ethereum Sepolia:** [0xD1d6EE0c5309A09Df9ca4c2936956A49cca9eb71](https://sepolia.etherscan.io/address/0xD1d6EE0c5309A09Df9ca4c2936956A49cca9eb71#code)
- **Avalanche Fuji:** [0x6444f16e29Bf33a8C9da2B89E472b58Bafe41b9c](https://testnet.snowtrace.io/address/0x6444f16e29Bf33a8C9da2B89E472b58Bafe41b9c#code)
- **Base Sepolia:** [0x7CC324d15E5fF17c43188fB63b462B9a79dA68f6](https://sepolia.basescan.org/address/0x7CC324d15E5fF17c43188fB63b462B9a79dA68f6#code)

### TreasuryAIManager
- **Avalanche Fuji:** [0x86C41594e9aDeCcf8c85ba9EEe0138C7c9E70dBc](https://testnet.snowtrace.io/address/0x86C41594e9aDeCcf8c85ba9EEe0138C7c9E70dBc#code)

### VaultFactory
- **Avalanche Fuji:** [0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54](https://testnet.snowtrace.io/address/0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54#code)

### VaultManager
- **Avalanche Fuji:** [0xF673F508104876c72C8724728f81d50E01649b40](https://testnet.snowtrace.io/address/0xF673F508104876c72C8724728f81d50E01649b40#code)

## Contract Details

### AaveVault

The `AaveVault` contract is a strategy vault that interacts with the Aave protocol. It allows the treasury to deposit assets, earn yield, and manage its position in Aave.

**Key Functions**

#### `initialize(address _treasuryAIManager)`
- **Description:** Initializes the `AaveVault` contract, setting the address of the `TreasuryAIManager`. This function can only be called once.
- **Parameters:**
    - `_treasuryAIManager` (address): The address of the `TreasuryAIManager` contract.
- **Usage:**
  ```javascript
  import { ethers } from "ethers";
  import AaveVault from "./AaveVault.json"; // Assuming you have the ABI

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const aaveVault = new ethers.Contract("0xB791Be1D932397e3eFa757C8d4B9F6BAC86F1Ca1", AaveVault.abi, signer);

  async function initializeVault(treasuryManagerAddress) {
    const tx = await aaveVault.initialize(treasuryManagerAddress);
    await tx.wait();
    console.log("AaveVault initialized");
  }
  ```

#### `deposit(uint256 amount)`
- **Description:** Deposits a specified amount of the underlying asset into the Aave protocol. This function can only be called by the owner of the contract.
- **Parameters:**
    - `amount` (uint256): The amount of the asset to deposit.
- **Usage:**
  ```javascript
  async function depositToAave(amount) {
    const tx = await aaveVault.deposit(amount);
    await tx.wait();
    console.log("Deposit successful");
  }
  ```

#### `withdraw(uint256 amount)`
- **Description:** Withdraws a specified amount of the underlying asset from the Aave protocol. This function can only be called by the owner.
- **Parameters:**
    - `amount` (uint256): The amount of the asset to withdraw.
- **Usage:**
  ```javascript
  async function withdrawFromAave(amount) {
    const tx = await aaveVault.withdraw(amount);
    await tx.wait();
    console.log("Withdrawal successful");
  }
  ```

#### `rebalance()`
- **Description:** Rebalances the vault's position in Aave. This function can only be called by the owner.
- **Usage:**
  ```javascript
  async function rebalanceVault() {
    const tx = await aaveVault.rebalance();
    await tx.wait();
    console.log("Rebalance successful");
  }
  ```

#### `setTargetAllocation(uint256 _targetAllocation)`
- **Description:** Sets the target allocation for the vault. This can only be called by the owner.
- **Parameters:**
    - `_targetAllocation` (uint256): The new target allocation.
- **Usage:**
  ```javascript
  async function setTargetAllocation(newAllocation) {
    const tx = await aaveVault.setTargetAllocation(newAllocation);
    await tx.wait();
    console.log("Target allocation updated");
  }
  ```

#### `getTotalValue()`
- **Description:** Returns the total value of the assets held in the vault.
- **Returns:**
    - `uint256`: The total value of the vault.
- **Usage:**
  ```javascript
  async function getTotalValue() {
    const totalValue = await aaveVault.getTotalValue();
    console.log("Total Vault Value:", totalValue.toString());
  }
  ```

#### `getCurrentAllocation()`
- **Description:** Returns the current allocation of the vault.
- **Returns:**
    - `uint256`: The current allocation.
- **Usage:**
  ```javascript
  async function getCurrentAllocation() {
    const currentAllocation = await aaveVault.getCurrentAllocation();
    console.log("Current Allocation:", currentAllocation.toString());
  }
  ```

#### `emergencyWithdraw()`
- **Description:** Allows the owner to withdraw all funds from the vault in case of an emergency.
- **Usage:**
  ```javascript
  async function emergencyWithdraw() {
    const tx = await aaveVault.emergencyWithdraw();
    await tx.wait();
    console.log("Emergency withdrawal successful");
  }
  ```

#### `getCurrentPrice()`
- **Description:** Returns the current price of the underlying asset and the timestamp of the last update.
- **Returns:**
    - `price` (uint256): The current price of the asset.
    - `lastUpdated` (uint256): The timestamp of the last price update.
- **Usage:**
  ```javascript
  async function getCurrentPrice() {
    const [price, lastUpdated] = await aaveVault.getCurrentPrice();
    console.log("Current Price:", price.toString());
    console.log("Last Updated:", new Date(lastUpdated * 1000));
  }
  ```

### CrossChainRouter

The `CrossChainRouter` contract facilitates the transfer of tokens across different blockchains using Chainlink's Cross-Chain Interoperability Protocol (CCIP).

**Key Functions**

#### `sendTokens(uint64 destinationChainSelector, address receiver, address token, uint256 amount)`
- **Description:** Sends a specified amount of a token to a receiver on a different blockchain. This function can only be called by the owner.
- **Parameters:**
    - `destinationChainSelector` (uint64): The chain selector of the destination blockchain.
    - `receiver` (address): The address of the recipient on the destination chain.
    - `token` (address): The address of the token to be sent.
    - `amount` (uint256): The amount of the token to send.
- **Usage:**
  ```javascript
  import { ethers } from "ethers";
  import CrossChainRouter from "./CrossChainRouter.json"; // Assuming you have the ABI

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const crossChainRouter = new ethers.Contract("0xD1d6EE0c5309A09Df9ca4c2936956A49cca9eb71", CrossChainRouter.abi, signer);

  async function sendTokens(destinationChainSelector, receiver, token, amount) {
    const tx = await crossChainRouter.sendTokens(destinationChainSelector, receiver, token, amount);
    await tx.wait();
    console.log("Tokens sent successfully");
  }
  ```

#### `setSupportedChain(uint64 chainSelector, bool supported)`
- **Description:** Sets a chain as supported or unsupported for cross-chain transfers. This can only be called by the owner.
- **Parameters:**
    - `chainSelector` (uint64): The chain selector of the chain to modify.
    - `supported` (bool): `true` to support the chain, `false` to unsupport it.
- **Usage:**
  ```javascript
  async function setSupportedChain(chainSelector, isSupported) {
    const tx = await crossChainRouter.setSupportedChain(chainSelector, isSupported);
    await tx.wait();
    console.log(`Chain ${chainSelector} support set to ${isSupported}`);
  }
  ```

#### `setSupportedToken(address token, bool supported)`
- **Description:** Sets a token as supported or unsupported for cross-chain transfers. This can only be called by the owner.
- **Parameters:**
    - `token` (address): The address of the token to modify.
    - `supported` (bool): `true` to support the token, `false` to unsupport it.
- **Usage:**
  ```javascript
  async function setSupportedToken(tokenAddress, isSupported) {
    const tx = await crossChainRouter.setSupportedToken(tokenAddress, isSupported);
    await tx.wait();
    console.log(`Token ${tokenAddress} support set to ${isSupported}`);
  }
  ```

#### `withdrawLink(uint256 amount)`
- **Description:** Withdraws a specified amount of LINK tokens from the contract. This can only be called by the owner.
- **Parameters:**
    - `amount` (uint256): The amount of LINK to withdraw.
- **Usage:**
  ```javascript
  async function withdrawLink(amount) {
    const tx = await crossChainRouter.withdrawLink(amount);
    await tx.wait();
    console.log("LINK withdrawn successfully");
  }
  ```

#### `withdrawERC20(address token, uint256 amount)`
- **Description:** Withdraws a specified amount of any ERC20 token from the contract. This can only be called by the owner.
- **Parameters:**
    - `token` (address): The address of the ERC20 token to withdraw.
    - `amount` (uint256): The amount of the token to withdraw.
- **Usage:**
  ```javascript
  async function withdrawErc20(tokenAddress, amount) {
    const tx = await crossChainRouter.withdrawERC20(tokenAddress, amount);
    await tx.wait();
    console.log("ERC20 token withdrawn successfully");
  }
  ```

**Internal Functions**

These functions are part of the contract's internal logic and are not meant to be called directly from the frontend.

- `_ccipReceive(Client.Any2EVMMessage memory message)`: This function is the entry point for receiving messages from the CCIP network. It is responsible for processing incoming cross-chain token transfers.
- `_getTokenAmounts(Client.EVMTokenAmount[] memory tokenAmounts)`: This internal function is used to decode the token amounts from a CCIP message.

### TreasuryAIManager

The `TreasuryAIManager` contract is the core component responsible for automated treasury management. It utilizes external data and AI-driven logic to make strategic decisions about asset allocation across different vaults. This contract is designed to work with Chainlink Keepers for periodic execution of its management tasks.

**Key Functions**

#### `setServiceLayer(address _serviceLayer)`
- **Description:** Sets the address of the service layer contract that is permitted to call `processDecision`. This is a critical security measure to ensure only authorized components can trigger strategy execution. This function can only be called by the owner.
- **Parameters:**
    - `_serviceLayer` (address): The address of the authorized service layer contract.
- **Usage:**
  ```javascript
  import { ethers } from "ethers";
  import TreasuryAIManager from "./TreasuryAIManager.json"; // Assuming you have the ABI

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const treasuryAIManager = new ethers.Contract("0x86C41594e9aDeCcf8c85ba9EEe0138C7c9E70dBc", TreasuryAIManager.abi, signer);

  async function setServiceLayer(serviceLayerAddress) {
    const tx = await treasuryAIManager.setServiceLayer(serviceLayerAddress);
    await tx.wait();
    console.log("Service layer address updated");
  }
  ```

#### `checkUpkeep(bytes calldata)` & `performUpkeep(bytes calldata)`
- **Description:** These functions are part of the Chainlink Keepers interface (`IAutomationCompatible`). `checkUpkeep` determines if the contract needs to perform its automated tasks, and `performUpkeep` executes them. These are generally not called directly by a user or frontend application but are triggered automatically by the Chainlink network. The upkeep process involves updating market data and making new strategy decisions.

#### `processDecision(address strategy, uint256 newTargetAllocation)`
- **Description:** This function is called by the authorized service layer to execute a decision made by the AI. It updates the target allocation for a specific strategy vault.
- **Parameters:**
    - `strategy` (address): The address of the strategy vault to update.
    - `newTargetAllocation` (uint256): The new target allocation for the strategy.
- **Usage:** This function is typically called by a backend service, not directly from the frontend.

#### `processDecision(address strategy, uint256 amount, bool isDeposit)`
- **Description:** An alternative version of `processDecision` for executing simple deposit or withdraw actions on a strategy vault.
- **Parameters:**
    - `strategy` (address): The address of the strategy vault.
    - `amount` (uint256): The amount to deposit or withdraw.
    - `isDeposit` (bool): `true` for a deposit, `false` for a withdrawal.
- **Usage:** This function is typically called by a backend service, not directly from the frontend.

#### `getLatestDecision(address strategy)`
- **Description:** A view function that returns the latest decision made for a specific strategy. This can be used by the frontend to display the AI's most recent actions or proposed changes.
- **Returns:**
    - `decisionType` (string): The type of decision (e.g., "DEPOSIT", "WITHDRAW", "REBALANCE").
    - `amount` (uint256): The amount associated with the decision.
    - `timestamp` (uint256): The timestamp when the decision was made.
- **Usage:**
  ```javascript
  async function getLatestDecision(strategyAddress) {
    const [decisionType, amount, timestamp] = await treasuryAIManager.getLatestDecision(strategyAddress);
    console.log("Latest Decision for", strategyAddress);
    console.log("Type:", decisionType);
    console.log("Amount:", amount.toString());
    console.log("Timestamp:", new Date(timestamp * 1000));
  }
  ```

#### `setSupportedStrategy(address strategy, bool supported)`
- **Description:** Allows the owner to add or remove a strategy from the list of supported strategies that the AI manager can interact with.
- **Parameters:**
    - `strategy` (address): The address of the strategy contract.
    - `supported` (bool): `true` to add support, `false` to remove it.
- **Usage:**
  ```javascript
  async function setSupportedStrategy(strategyAddress, isSupported) {
    const tx = await treasuryAIManager.setSupportedStrategy(strategyAddress, isSupported);
    await tx.wait();
    console.log(`Strategy ${strategyAddress} support set to ${isSupported}`);
  }
  ```

#### `setPriceFeed(address token, address priceFeed)`
- **Description:** Sets the Chainlink price feed address for a specific token. This is crucial for the AI to get accurate market data.
- **Parameters:**
    - `token` (address): The address of the token.
    - `priceFeed` (address): The address of the Chainlink price feed for that token.
- **Usage:**
  ```javascript
  async function setPriceFeed(tokenAddress, priceFeedAddress) {
    const tx = await treasuryAIManager.setPriceFeed(tokenAddress, priceFeedAddress);
    await tx.wait();
    console.log(`Price feed for ${tokenAddress} updated.`);
  }
  ```

**Internal Functions**

- `_updateMarketData()`: Fetches the latest market data, such as prices and volatility, from Chainlink oracles.
- `_makeStrategyDecisions()`: The core logic where the AI analyzes market data and formulates new strategy decisions.
- `_calculateVolatility()`: Calculates the volatility of an asset.
- `_getVolume()`: Retrieves trading volume data for an asset.

### VaultFactory

The `VaultFactory` contract is responsible for creating and managing different types of strategy vaults. It uses a proxy pattern, allowing for upgradable vault implementations.

**Key Functions**

#### `setVaultImplementation(string memory _vaultType, address _implementation)`
- **Description:** Sets the implementation address for a specific type of vault (e.g., "AaveVault", "CurveVault"). This allows the factory to deploy new vaults with the correct logic. This function can only be called by the owner.
- **Parameters:**
    - `_vaultType` (string): The type of the vault.
    - `_implementation` (address): The address of the implementation contract.
- **Usage:**
  ```javascript
  import { ethers } from "ethers";
  import VaultFactory from "./VaultFactory.json"; // Assuming you have the ABI

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const vaultFactory = new ethers.Contract("0xC310b43748E5303F1372Ab2C9075629E0Bb4FE54", VaultFactory.abi, signer);

  async function setVaultImplementation(vaultType, implementationAddress) {
    const tx = await vaultFactory.setVaultImplementation(vaultType, implementationAddress);
    await tx.wait();
    console.log(`Implementation for ${vaultType} set to ${implementationAddress}`);
  }
  ```

#### `setTreasuryAIManager(address _treasuryAIManager)`
- **Description:** Sets the address of the `TreasuryAIManager` contract. This address is passed to newly created vaults during their initialization. This function can only be called by the owner.
- **Parameters:**
    - `_treasuryAIManager` (address): The address of the `TreasuryAIManager`.
- **Usage:**
  ```javascript
  async function setTreasuryAIManager(managerAddress) {
    const tx = await vaultFactory.setTreasuryAIManager(managerAddress);
    await tx.wait();
    console.log("TreasuryAIManager address updated");
  }
  ```

#### `createVault(string memory _vaultType)`
- **Description:** Creates a new vault of a specified type. This function deploys a new proxy contract and initializes it with the logic of the corresponding implementation contract.
- **Parameters:**
    - `_vaultType` (string): The type of vault to create.
- **Returns:**
    - `address`: The address of the newly created vault.
- **Usage:**
  ```javascript
  async function createVault(vaultType) {
    const tx = await vaultFactory.createVault(vaultType);
    const receipt = await tx.wait();
    const newVaultAddress = receipt.events[0].args.vaultAddress; // Example of how to get the address from events
    console.log(`New ${vaultType} created at: ${newVaultAddress}`);
    return newVaultAddress;
  }
  ```

#### `getVaultCount()`
- **Description:** Returns the total number of vaults created by the factory.
- **Returns:**
    - `uint256`: The total count of vaults.
- **Usage:**
  ```javascript
  async function getVaultCount() {
    const count = await vaultFactory.getVaultCount();
    console.log("Total vaults created:", count.toString());
  }
  ```

#### `getVaultsByType(string memory _vaultType)`
- **Description:** Returns an array of addresses for all vaults of a specific type.
- **Parameters:**
    - `_vaultType` (string): The type of vaults to retrieve.
- **Returns:**
    - `address[]`: An array of vault addresses.
- **Usage:**
  ```javascript
  async function getVaultsByType(vaultType) {
    const vaults = await vaultFactory.getVaultsByType(vaultType);
    console.log(`Vaults of type ${vaultType}:`, vaults);
    return vaults;
  }
  ```

### VaultManager

The `VaultManager` contract acts as a central hub for users to manage their investments in various strategy vaults. It simplifies the process of depositing into and withdrawing from vaults, and provides a unified interface for portfolio management.

**Key Functions**

#### `createVault(string memory _vaultType, address _owner)`
- **Description:** Allows a user to create a new vault of a specific type. This function likely calls the `VaultFactory` to deploy the new vault and assigns ownership to the user.
- **Parameters:**
    - `_vaultType` (string): The type of vault to create (e.g., "AaveVault").
    - `_owner` (address): The address that will own the new vault.
- **Usage:**
  ```javascript
  import { ethers } from "ethers";
  import VaultManager from "./VaultManager.json"; // Assuming you have the ABI

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  const vaultManager = new ethers.Contract("0xF673F508104876c72C8724728f81d50E01649b40", VaultManager.abi, signer);

  async function createVault(vaultType, ownerAddress) {
    const tx = await vaultManager.createVault(vaultType, ownerAddress);
    await tx.wait();
    console.log(`New vault created for owner ${ownerAddress}`);
  }
  ```

#### `deposit(address vaultId, uint256 amount)`
- **Description:** Deposits a specified amount of an asset into a user's vault. The user must have approved the `VaultManager` to spend their tokens beforehand.
- **Parameters:**
    - `vaultId` (address): The address of the vault to deposit into.
    - `amount` (uint256): The amount of the asset to deposit.
- **Usage:**
  ```javascript
  // First, the user needs to approve the VaultManager contract
  // const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  // const approveTx = await tokenContract.approve(vaultManager.address, amount);
  // await approveTx.wait();

  async function depositIntoVault(vaultAddress, depositAmount) {
    const tx = await vaultManager.deposit(vaultAddress, depositAmount);
    await tx.wait();
    console.log(`Successfully deposited ${depositAmount} into ${vaultAddress}`);
  }
  ```

#### `withdraw(address vaultId, uint256 shares)`
- **Description:** Withdraws a specified number of shares from a vault, which are then redeemed for the underlying asset.
- **Parameters:**
    - `vaultId` (address): The address of the vault to withdraw from.
    - `shares` (uint256): The number of vault shares to withdraw.
- **Usage:**
  ```javascript
  async function withdrawFromVault(vaultAddress, sharesAmount) {
    const tx = await vaultManager.withdraw(vaultAddress, sharesAmount);
    await tx.wait();
    console.log(`Successfully withdrew ${sharesAmount} shares from ${vaultAddress}`);
  }
  ```

#### `setVaultStatus(address vaultId, bool isActive)`
- **Description:** Allows the owner of the `VaultManager` to activate or deactivate a vault. This can be used to pause interactions with a specific vault if needed.
- **Parameters:**
    - `vaultId` (address): The address of the vault.
    - `isActive` (bool): `true` to activate, `false` to deactivate.
- **Usage:**
  ```javascript
  async function setVaultStatus(vaultAddress, status) {
    const tx = await vaultManager.setVaultStatus(vaultAddress, status);
    await tx.wait();
    console.log(`Vault ${vaultAddress} status set to ${status}`);
  }
  ```

#### `checkUpkeep(bytes calldata)` & `performUpkeep(bytes calldata)`
- **Description:** These functions are part of the Chainlink Keepers interface. They allow for automated, periodic rebalancing of all active vaults managed by this contract. This is a key feature for maintaining the health of the investment strategies without manual intervention. These are generally not called directly by users.

**IStrategyVault Interface**

The `VaultManager` interacts with strategy vaults that conform to the `IStrategyVault` interface. This ensures that any vault, regardless of its specific strategy (Aave, Curve, etc.), can be managed in a standardized way. The interface includes the following functions:
- `deposit(uint256 amount)`
- `withdraw(uint256 amount)`
- `getCurrentAllocation()`
- `getTargetAllocation()`
- `rebalance()`


This guide provides a comprehensive overview of how the frontend should interact with the TokenIQ smart contracts. It includes descriptions of key functions, their parameters, and `ethers.js` examples for seamless integration.

## 📚 Table of Contents

---

## Getting Started

To interact with the TokenIQ contracts, you will need to use a library like `ethers.js` to connect to the Ethereum network. You will also need the contract ABIs and their deployed addresses.

### Example Setup

```javascript
import { ethers } from "ethers";

// ABIs (replace with actual ABIs)
import TreasuryAIManager from "./TreasuryAIManager.json";
import VaultFactory from "./VaultFactory.json";
import VaultManager from "./VaultManager.json";

// Deployed contract addresses
const contractAddresses = {
  treasuryAIManager: "0x01b4231651841595285785629a395A59422A193c", // Fuji
  vaultFactory: "0x76c243f394697999aF123C529395212399A53542",      // Fuji
  vaultManager: "0xF673F508104876c72C8724728f81d50E01649b40",      // Fuji
};

// Connect to the provider
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Instantiate contracts
const treasuryAIManager = new ethers.Contract(contractAddresses.treasuryAIManager, TreasuryAIManager.abi, signer);
const vaultFactory = new ethers.Contract(contractAddresses.vaultFactory, VaultFactory.abi, signer);
const vaultManager = new ethers.Contract(contractAddresses.vaultManager, VaultManager.abi, signer);
```

---

## Contract Overview

*   **TreasuryAIManager**: An AI-driven contract that makes decisions about treasury management and strategy allocations. It is automated with Chainlink Keepers.
*   **VaultFactory**: A factory for creating new, upgradable vault instances of different types (e.g., Aave, Curve).
*   **VaultManager**: The main entry point for users to interact with their vaults, including deposits, withdrawals, and balance checks.
*   **AaveVault**: A strategy vault that deposits assets into the Aave lending protocol to earn yield.
*   **CrossChainRouter**: Facilitates sending tokens across different blockchains using Chainlink CCIP.

---

## Core Contracts

### TreasuryAIManager

*   **Deployed on**: Avalanche Fuji
*   **Address**: `0x01b4231651841595285785629a395A59422A193c`

This contract uses AI to make decisions about how to allocate assets across different investment strategies. It is automated with Chainlink Keepers.

#### Key Functions

*   `performUpkeep(bytes calldata)`: Triggered by Chainlink Keepers to update market data and make new strategy decisions. This is not called directly by users.
*   `processDecision(...)`: Called by the off-chain service layer to update a strategy decision with a new allocation. There are two versions of this function.
*   `getLatestDecision(address strategy)`: Retrieves the most recent AI-driven decision for a given strategy.
*   `setSupportedStrategy(address strategy, bool supported)`: Allows the owner to add or remove a strategy from the list of supported strategies. This is how you `addAllowedVault` or `removeAllowedVault`.

### VaultFactory

*   **Deployed on**: Avalanche Fuji
*   **Address**: `0x76c243f394697999aF123C529395212399A53542`

This factory contract is used to create new instances of different vault types. It uses a proxy pattern (clones) to deploy new vaults, which makes them upgradable.

#### Key Functions

*   `createVault(string memory _vaultType)`: Creates a new vault of the specified type (e.g., "aave", "curve").
*   `getVaultsByType(string memory _vaultType)`: Returns an array of all vaults of a specific type.
*   `allVaults`: A public array that stores the addresses of all created vaults. You can call this directly to get the list of all vaults.

### VaultManager

*   **Deployed on**: Avalanche Fuji
*   **Address**: `0xF673F508104876c72C8724728f81d50E01649b40`

This is the main contract for users to manage their investments. It handles deposits, withdrawals, and keeps track of user balances in each vault.

#### Key Functions

*   `createVault(address strategy, address token)`: Creates a new vault with a specific strategy and deposit token. (Owner-only)
*   `deposit(address vaultId, uint256 amount)`: Deposits tokens into a specified vault.
*   `withdraw(address vaultId, uint256 shares)`: Withdraws a specified number of shares from a vault.
*   `userInfo(address vaultId, address userAddress)`: A public mapping that returns a user's information for a specific vault, including their `shares` balance.

#### Example: Getting a User's Vault Balance

```javascript
async function getVaultBalance(vaultAddress, userAddress) {
  const userInfo = await vaultManager.userInfo(vaultAddress, userAddress);
  const shares = userInfo.shares;
  console.log(`User ${userAddress} has ${ethers.utils.formatUnits(shares, 18)} shares in vault ${vaultAddress}`);
  return shares;
}
```

### AaveVault

*   **Deployed on**: Ethereum Sepolia
*   **Address**: `0x244499e4a373385951052571344445585Ab5a373`

This contract implements a strategy for earning yield by depositing assets into the Aave V3 lending protocol.

#### Key Functions

*   `deposit(uint256 amount)`: Deposits assets into the vault. (Owner-only)
*   `withdraw(uint256 amount)`: Withdraws assets from the vault. (Owner-only)
*   `rebalance()`: Adjusts the vault's position in Aave to optimize yield. (Owner-only)
*   `getTotalValue()`: Returns the total value of assets held in the vault.
*   `getCurrentAllocation()`: Returns the current allocation of assets in Aave.

### CrossChainRouter

*   **Deployed on**: Ethereum Sepolia, Avalanche Fuji, Base Sepolia
*   **Address**: `0x917C79707124785313927536411224421A25b73D` (Sepolia)

This contract enables cross-chain token transfers using Chainlink's Cross-Chain Interoperability Protocol (CCIP).

#### Key Functions

*   `sendTokens(uint64 destinationChainSelector, address token, uint256 amount)`: Sends tokens to a specified destination chain.

---

## Interacting with Contracts

### Example: Creating a New Vault

```javascript
async function createNewVault(vaultType) {
  try {
    const tx = await vaultFactory.createVault(vaultType);
    const receipt = await tx.wait();
    console.log('Vault created:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error creating vault:', error);
  }
}

// Example usage
createNewVault('aave');
```

### Example: Depositing Tokens into a Vault

```javascript
async function depositToVault(vaultId, amount) {
  try {
    // First, approve the VaultManager to spend the user's tokens
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    const approveTx = await tokenContract.approve(contractAddresses.vaultManager, amount);
    await approveTx.wait();

    // Then, deposit the tokens
    const depositTx = await vaultManager.deposit(vaultId, amount);
    const receipt = await depositTx.wait();
    console.log('Deposit successful:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error depositing to vault:', error);
  }
}

// Example usage
depositToVault('0xVaultAddress...', ethers.utils.parseUnits('100', 18)); // For 100 tokens with 18 decimals
```

### Example: Withdrawing from a Vault

```javascript
async function withdrawFromVault(vaultId, shares) {
  try {
    const tx = await vaultManager.withdraw(vaultId, shares);
    const receipt = await tx.wait();
    console.log('Withdrawal successful:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error withdrawing from vault:', error);
  }
}

// Example usage
withdrawFromVault('0xVaultAddress...', ethers.utils.parseUnits('50', 18)); // For 50 shares
```

---

## AI & Strategy Management

### Interacting with the AI Manager (`TreasuryAIManager.sol`)

The frontend can retrieve the latest AI-driven strategy decisions from the `TreasuryAIManager`.

#### `getLatestDecision(address strategy)`

Fetches the most recent decision for a given strategy.

*   **`strategy`**: The address of the strategy contract.

```javascript
async function getLatestStrategyDecision(strategyAddress) {
  try {
    const decision = await treasuryAIManager.getLatestDecision(strategyAddress);
    console.log('Latest decision:', {
      allocation: decision.allocation.toString(),
      reason: decision.reason,
      timestamp: new Date(decision.timestamp * 1000),
    });
    return decision;
  } catch (error) {
    console.error('Error getting latest decision:', error);
  }
}

// Example usage
getLatestStrategyDecision('0xStrategyAddress...');
```

### Strategy-Specific Functions (`AaveVault.sol`)

While most interactions go through the `VaultManager`, some strategy-specific data can be read directly from the vault contracts.

#### `getTotalValue()`

Returns the total value of assets held in the vault.

```javascript
async function getVaultTotalValue(vaultAddress) {
  const aaveVault = new ethers.Contract(vaultAddress, aaveVaultAbi, provider);
  try {
    const totalValue = await aaveVault.getTotalValue();
    console.log('Total vault value:', ethers.utils.formatUnits(totalValue, 18));
    return totalValue;
  } catch (error) {
    console.error('Error getting total value:', error);
  }
}

// Example usage
getVaultTotalValue('0xVaultAddress...');
```

---

## Cross-Chain Operations

### Sending Tokens Across Chains (`CrossChainRouter.sol`)

To move assets to a different blockchain, the frontend will use the `CrossChainRouter`.

#### `sendTokens(uint64 destinationChainSelector, address token, uint256 amount)`

Sends a specified amount of tokens to another chain via Chainlink CCIP.

*   **`destinationChainSelector`**: The CCIP chain selector for the destination chain.
*   **`token`**: The address of the token to send.
*   **`amount`**: The amount of tokens to send.

```javascript
async function sendTokensCrossChain(destinationChain, tokenAddress, amount) {
  try {
    // First, approve the CrossChainRouter to spend the tokens
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    const approveTx = await tokenContract.approve(contractAddresses.crossChainRouter, amount);
    await approveTx.wait();

    // Then, send the tokens
    const sendTx = await crossChainRouter.sendTokens(destinationChain, tokenAddress, amount);
    const receipt = await sendTx.wait();
    console.log('Cross-chain send successful:', receipt);
    return receipt;
  } catch (error) {
    console.error('Error sending tokens cross-chain:', error);
  }
}

// Example usage (sending to Arbitrum)
const arbitrumChainSelector = '3478487238524512106';
const tokenAddress = '0x...'; // e.g., USDC
const amount = ethers.utils.parseUnits('1000', 6); // For 1000 USDC with 6 decimals

sendTokensCrossChain(arbitrumChainSelector, tokenAddress, amount);
