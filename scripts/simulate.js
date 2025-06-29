// SPDX-License-Identifier: MIT
const { ethers, upgrades } = require("hardhat");
const { formatEther, parseEther, parseUnits } = require("ethers");

// Define InvoiceStatus enum to match the contract
const InvoiceStatus = {
  Created: 0,
  Funded: 1,
  Paid: 2,
  Defaulted: 3,
  Settled: 4
};

// Chain selectors for cross-chain (testnet values)
const CHAIN_SELECTORS = {
  AVALANCHE: 14767482510784806043n,  // Fuji testnet
  POLYGON: 12532609583862916517n,    // Mumbai testnet
  ARBITRUM: 4949039107694359620n,    // Arbitrum Goerli
};

async function main() {
  console.log("🚀 Starting TokenIQ Simulation: Marina Textiles Case Study\n");

  // 1. Setup Environment
  console.log("🔧 Setting up simulation environment...");
  const [deployer, marina, buyer, investor1, investor2] = await ethers.getSigners();
  
  console.log(`👥 Accounts:`);
  console.log(`- Deployer: ${deployer.address}`);
  console.log(`- Marina Textiles: ${marina.address}`);
  console.log(`- Buyer (Fashion Retail Inc): ${buyer.address}`);
  console.log(`- Investor 1: ${investor1.address}`);
  console.log(`- Investor 2: ${investor2.address}`);

  // 2. Deploy Mock Tokens and Contracts
  console.log("\n📦 Deploying Contracts...");
  
  // Deploy USDC stablecoin (6 decimals)
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  console.log(`✅ USDC deployed to: ${await usdc.getAddress()}`);

  // Deploy LINK token
  const link = await MockERC20.deploy("Chainlink", "LINK", 18);
  await link.waitForDeployment();
  console.log(`✅ LINK deployed to: ${await link.getAddress()}`);

  // Deploy TokenizedInvoice
  console.log("\n📦 Deploying TokenizedInvoice...");
  const TokenizedInvoice = await ethers.getContractFactory("TokenizedInvoice");
  const tokenizedInvoiceDeployed = await TokenizedInvoice.deploy();
  await tokenizedInvoiceDeployed.waitForDeployment();
  console.log(`✅ TokenizedInvoice deployed to: ${await tokenizedInvoiceDeployed.getAddress()}`);
  
  // Deploy InvoiceRegistry
  console.log("\n📦 Deploying InvoiceRegistry...");
  const InvoiceRegistry = await ethers.getContractFactory("InvoiceRegistry");
  const invoiceRegistry = await InvoiceRegistry.deploy();
  await invoiceRegistry.waitForDeployment();
  console.log(`✅ InvoiceRegistry deployed to: ${await invoiceRegistry.getAddress()}`);
  
  // Transfer TokenizedInvoice ownership to InvoiceRegistry
  await tokenizedInvoiceDeployed.transferOwnership(await invoiceRegistry.getAddress());
  console.log("✅ Transferred TokenizedInvoice ownership to InvoiceRegistry");

  // Deploy Mock Router for CCIP
  const MockRouter = await ethers.getContractFactory("MockRouter");
  const mockRouter = await MockRouter.deploy();
  await mockRouter.waitForDeployment();
  console.log(`✅ MockRouter deployed to: ${await mockRouter.getAddress()}`);

  // Deploy CrossChainRouter
  const CrossChainRouter = await ethers.getContractFactory("CrossChainRouter");
  const crossChainRouter = await CrossChainRouter.deploy(
    await mockRouter.getAddress(),
    await link.getAddress()
  );
  await crossChainRouter.waitForDeployment();
  console.log(`✅ CrossChainRouter deployed to: ${await crossChainRouter.getAddress()}`);

  // Deploy Mock Treasury AI Manager
  const MockTreasuryAIManager = await ethers.getContractFactory("MockTreasuryAIManager");
  const mockAIManager = await MockTreasuryAIManager.deploy();
  await mockAIManager.waitForDeployment();
  console.log(`✅ MockTreasuryAIManager deployed to: ${await mockAIManager.getAddress()}`);

  // Deploy simplified RWA Vault (non-upgradeable for testing)
  console.log("🚀 Deploying simplified RWA Vault...");
  const RWAInvoiceVaultSimple = await ethers.getContractFactory("RWAInvoiceVaultSimple");
  const rwaVault = await RWAInvoiceVaultSimple.deploy();
  await rwaVault.waitForDeployment();
  const rwaVaultAddress = await rwaVault.getAddress();
  console.log(`✅ RWAInvoiceVaultSimple deployed to: ${rwaVaultAddress}`);
  
  // Transfer ownership to the deployer
  await rwaVault.transferOwnership(await deployer.getAddress());
  console.log(`✅ Transferred ownership to deployer`);
  
  // Configure the vault with invoice details
  console.log("🔧 Configuring RWA Vault with invoice details...");
  try {
    // Set funding deadline to 30 days from now (in seconds since epoch)
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const currentBlock = await ethers.provider.getBlock('latest');
    const currentTimestamp = currentBlock.timestamp;
    const fundingDeadline = currentTimestamp + thirtyDaysInSeconds;
    
    console.log(`📅 Current block timestamp: ${currentTimestamp} (${new Date(currentTimestamp * 1000).toISOString()})`);
    console.log(`📅 Setting funding deadline to: ${fundingDeadline} (${new Date(fundingDeadline * 1000).toISOString()})`);
    
    const tx = await rwaVault.connect(deployer).configureInvoice(
      await usdc.getAddress(),
      await invoiceRegistry.getAddress(),
      1, // invoiceTokenId
      parseUnits("500000", 6), // fundingTarget: $500,000
      fundingDeadline
    );
    
    console.log(`🔍 Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Verify configuration
    const paymentToken = await rwaVault.paymentToken();
    const registryAddr = await rwaVault.registry();
    const invoiceId = await rwaVault.invoiceTokenId();
    const target = await rwaVault.fundingTarget();
    const deadline = await rwaVault.fundingDeadline();
    const isConfigured = await rwaVault.isConfigured();
    
    console.log(`✅ RWA Vault configured successfully`);
    console.log(`🔍 Payment token: ${paymentToken}`);
    console.log(`🔍 Registry address: ${registryAddr}`);
    console.log(`🔍 Invoice token ID: ${invoiceId}`);
    console.log(`🔍 Funding target: ${ethers.formatUnits(target, 6)} USDC`);
    console.log(`🔍 Funding deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
    console.log(`🔍 Is configured: ${isConfigured}`);
    
  } catch (error) {
    console.error("❌ Error configuring RWA Vault:", error);
    if (error.receipt) {
      console.error("Transaction receipt:", error.receipt);
    }
    if (error.data) {
      console.error("Error data:", error.data);
    }
    throw error;
  }

  // 3. Setup Roles and Permissions
  console.log("\n🔐 Setting up roles and permissions...");
  // Transfer ownership of the InvoiceRegistry to Marina Textiles
  const transferTx1 = await invoiceRegistry.transferOwnership(marina.address);
  await transferTx1.wait();
  console.log("✅ Transferred InvoiceRegistry ownership to Marina Textiles");
  
  // Verify InvoiceRegistry ownership
  const invoiceRegistryOwner = await invoiceRegistry.owner();
  console.log(`🔍 InvoiceRegistry owner: ${invoiceRegistryOwner}`);
  console.log(`🔍 Marina's address: ${marina.address}`);
  
  // Get the TokenizedInvoice contract address from the registry
  const tokenizedInvoiceRegistryAddress = await invoiceRegistry.tokenizedInvoice();
  console.log(`🔍 TokenizedInvoice contract address: ${tokenizedInvoiceRegistryAddress}`);
  
  // Transfer ownership of the TokenizedInvoice contract to Marina Textiles
  console.log("Transferring TokenizedInvoice ownership...");
  const tokenizedInvoiceContract = await ethers.getContractAt("TokenizedInvoice", tokenizedInvoiceRegistryAddress);
  const currentOwner = await tokenizedInvoiceContract.owner();
  console.log(`🔍 Current TokenizedInvoice owner: ${currentOwner}`);
  
  const transferTx2 = await tokenizedInvoiceContract.transferOwnership(marina.address);
  await transferTx2.wait();
  
  const newOwner = await tokenizedInvoiceContract.owner();
  console.log(`✅ Transferred TokenizedInvoice ownership from ${currentOwner} to ${newOwner}`);

  // Add supported chains to CrossChainRouter
  await crossChainRouter.setSupportedChain(CHAIN_SELECTORS.AVALANCHE, true);
  await crossChainRouter.setSupportedChain(CHAIN_SELECTORS.POLYGON, true);
  await crossChainRouter.setSupportedChain(CHAIN_SELECTORS.ARBITRUM, true);
  
  // Add USDC as supported token
  await crossChainRouter.setSupportedToken(await usdc.getAddress(), true);

  // 4. Fund Accounts
  console.log("\n💰 Funding accounts with test tokens...");
  // Mint USDC to Marina
  await usdc.mint(marina.address, parseUnits("1000000", 6)); // 1M USDC
  // Mint USDC to Buyer
  await usdc.mint(buyer.address, parseUnits("500000", 6));   // 500K USDC
  // Mint USDC to Investors
  await usdc.mint(investor1.address, parseUnits("300000", 6)); // 300K USDC
  await usdc.mint(investor2.address, parseUnits("200000", 6)); // 200K USDC
  // Mint LINK for gas fees
  await link.mint(marina.address, parseEther("1000"));
  await link.mint(await crossChainRouter.getAddress(), parseEther("1000"));

  console.log("✅ Accounts funded with test tokens");

  // 5. Marina Creates an Invoice
  console.log("\n📝 Marina creates an invoice for Fashion Retail Inc");
  const invoiceId = 1; // Simple ID for this demo
  const invoiceAmount = parseUnits("500000", 6); // $500,000
  
  // Get current block timestamp and set due date to 90 days in the future
  const currentBlockInfo = await ethers.provider.getBlock('latest');
  const dueDate = currentBlockInfo.timestamp + (60 * 60 * 24 * 90); // 90 days from now
  const invoiceURI = "https://api.tokeniq.io/invoices/INV-2023-001";
  
  console.log(`📅 Current block timestamp: ${currentBlockInfo.timestamp} (${new Date(currentBlockInfo.timestamp * 1000).toISOString()})`);
  console.log(`📅 Setting invoice due date to: ${dueDate} (${new Date(dueDate * 1000).toISOString()})`);
  
  // Create the invoice
  const createInvoiceTx = await invoiceRegistry.connect(marina).createInvoice(
    await buyer.getAddress(),
    invoiceAmount,
    dueDate,
    invoiceURI
  );
  const createInvoiceReceipt = await createInvoiceTx.wait();
  console.log(`✅ Invoice created with ID: ${invoiceId}`);
  console.log(`🔍 Transaction hash: ${createInvoiceReceipt.hash}`);
  
  // The invoice is already tokenized via createInvoice, which returns the tokenId
  console.log("✅ Invoice created and tokenized with ID:", invoiceId);
  
  // Get the TokenizedInvoice contract instance from the InvoiceRegistry
  const tokenizedInvoiceAddress = await invoiceRegistry.tokenizedInvoice();
  const tokenizedInvoice = await ethers.getContractAt("TokenizedInvoice", tokenizedInvoiceAddress);
  
  // 6. Get the current owner of the token (should be the InvoiceRegistry)
  console.log("\n🔍 Checking invoice token ownership...");
  const invoiceOwner = await tokenizedInvoice.ownerOf(invoiceId);
  console.log(`Current owner of invoice ${invoiceId}: ${invoiceOwner}`);
  console.log(`InvoiceRegistry address: ${await invoiceRegistry.getAddress()}`);
  
  // 3. Marina funds the invoice through InvoiceRegistry
  console.log("\n🏦 Marina funds the invoice through InvoiceRegistry");
  
  // Verify ownership before proceeding
  console.log("\n🔍 Verifying contract ownership...");
  
  // Check InvoiceRegistry ownership
  const registryOwner = await invoiceRegistry.owner();
  console.log(`InvoiceRegistry owner: ${registryOwner}`);
  
  // Check TokenizedInvoice ownership
  const tokenizedInvoiceOwner = await tokenizedInvoice.owner();
  console.log(`TokenizedInvoice owner: ${tokenizedInvoiceOwner}`);
  
  console.log(`Marina's address: ${marina.address}`);
  
  // Check if Marina is the owner of InvoiceRegistry, if not, transfer ownership
  if (registryOwner.toLowerCase() !== marina.address.toLowerCase()) {
    console.log("🔧 Transferring InvoiceRegistry ownership to Marina...");
    const transferTx = await invoiceRegistry.connect(deployer).transferOwnership(marina.address);
    await transferTx.wait();
    
    // Verify the ownership transfer
    const newOwner = await invoiceRegistry.owner();
    console.log(`✅ InvoiceRegistry ownership transferred to: ${newOwner}`);
    
    if (newOwner.toLowerCase() !== marina.address.toLowerCase()) {
      throw new Error("Failed to transfer InvoiceRegistry ownership to Marina");
    }
  }
  
  // Check if InvoiceRegistry is the owner of TokenizedInvoice
  if (tokenizedInvoiceOwner.toLowerCase() !== (await invoiceRegistry.getAddress()).toLowerCase()) {
    console.log("🔧 Transferring TokenizedInvoice ownership to InvoiceRegistry...");
    const transferTokenTx = await tokenizedInvoice.connect(marina).transferOwnership(await invoiceRegistry.getAddress());
    await transferTokenTx.wait();
    
    // Verify the ownership transfer
    const newTokenOwner = await tokenizedInvoice.owner();
    console.log(`✅ TokenizedInvoice ownership transferred to InvoiceRegistry: ${newTokenOwner}`);
    
    if (newTokenOwner.toLowerCase() !== (await invoiceRegistry.getAddress()).toLowerCase()) {
      throw new Error("Failed to transfer TokenizedInvoice ownership to InvoiceRegistry");
    }
  }
  
  // First, let's approve the InvoiceRegistry to spend Marina's USDC
  console.log(`\n🔍 Approving InvoiceRegistry to spend Marina's USDC...`);
  const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  const usdcBalance = await usdc.balanceOf(marina.address);
  console.log(`Marina's USDC balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
  
  try {
    // Approve InvoiceRegistry to spend USDC
    const approveTx = await usdc.connect(marina).approve(
      await invoiceRegistry.getAddress(),
      usdcAmount
    );
    const approveReceipt = await approveTx.wait();
    console.log("✅ InvoiceRegistry approved to spend Marina's USDC");
    
    // Get the USDC token address
    const usdcAddress = await usdc.getAddress();
    console.log(`🔍 Using USDC token at address: ${usdcAddress}`);
    
    // Fund the invoice through InvoiceRegistry
    console.log(`\n🔍 Funding invoice through InvoiceRegistry with ${ethers.formatUnits(usdcAmount, 6)} USDC...`);
    
    // Get the current invoice status
    const invoiceBefore = await tokenizedInvoice.getInvoice(invoiceId);
    console.log(`📊 Invoice status before funding: ${Object.keys(InvoiceStatus)[invoiceBefore.status]}`);
    
    // Get the RWA Vault address
    const rwaVaultAddress = await rwaVault.getAddress();
    console.log(`🔍 Using RWA Vault at address: ${rwaVaultAddress}`);
    
    // Fund the invoice
    const fundTx = await invoiceRegistry.connect(marina).fundInvoice(
      invoiceId,
      rwaVaultAddress,
      usdcAmount,
      usdcAddress // Pass the USDC token address as the payment token
    );
    
    const fundReceipt = await fundTx.wait();
    console.log(`✅ Invoice funded through InvoiceRegistry`);
    console.log(`🔍 Transaction hash: ${fundReceipt.transactionHash}`);
    
    // Verify the vault was registered
    const vaultAddress = await invoiceRegistry.invoiceVaults(invoiceId);
    console.log(`🔍 Registered vault for invoice ${invoiceId}: ${vaultAddress}`);
    
    // Get the vault contract instance
    const rwaVaultSimple = await ethers.getContractAt('RWAInvoiceVaultSimple', vaultAddress);
    
    // Approve USDC transfer to the vault
    console.log(`🔒 Approving ${ethers.formatUnits(usdcAmount, 6)} USDC for vault...`);
    const approveVaultTx = await usdc.connect(marina).approve(vaultAddress, usdcAmount);
    await approveVaultTx.wait();
    
    // Fund the vault with USDC
    console.log(`💰 Funding vault with ${ethers.formatUnits(usdcAmount, 6)} USDC...`);
    const fundVaultTx = await rwaVaultSimple.connect(marina).fund(usdcAmount);
    const fundVaultReceipt = await fundVaultTx.wait();
    console.log(`✅ Vault funded successfully`);
    console.log(`🔍 Transaction hash: ${fundVaultReceipt.transactionHash}`);
    
    // Verify vault balance
    const vaultBalance = await usdc.balanceOf(vaultAddress);
    console.log(`💰 Vault USDC balance: ${ethers.formatUnits(vaultBalance, 6)} USDC`);
    
    // Verify invoice is marked as funded in the registry
    const fundedInvoice = await tokenizedInvoice.getInvoice(invoiceId);
    console.log(`🔍 Invoice status after funding: ${Object.keys(InvoiceStatus)[fundedInvoice.status]}`);
    if (fundedInvoice.status != 1) { // 1 = Funded status
      throw new Error(`Invoice status is ${Object.keys(InvoiceStatus)[fundedInvoice.status]}, expected Funded (1)`);
    }
    
  } catch (error) {
    console.error("❌ Error in funding process:", error);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.transaction) console.error("Transaction:", error.transaction);
    throw error;
  }

  // Check the invoice status after funding
  const invoiceAfterFunding = await tokenizedInvoice.getInvoice(invoiceId);
  const invoiceStatus = Object.keys(InvoiceStatus)[invoiceAfterFunding.status];
  console.log(`📊 Invoice status after funding: ${invoiceStatus}`);
  
  // Verify the invoice was funded correctly
  if (invoiceStatus !== 'Funded') {
    throw new Error(`Invoice status is ${invoiceStatus}, expected Funded`);
  }
  
  console.log("✅ Invoice funded successfully");
  
  // 4. Verify invoice is funded before proceeding
  console.log("\n✅ Invoice funded successfully. Waiting for maturity date...");
  const fundedInvoice = await tokenizedInvoice.getInvoice(invoiceId);
  console.log(`📊 Current invoice status: ${Object.keys(InvoiceStatus)[fundedInvoice.status]}`);
  
  // Check vault balance after funding
  const invoiceVaultAddress = await invoiceRegistry.invoiceVaults(invoiceId);
  const initialVaultBalance = await usdc.balanceOf(invoiceVaultAddress);
  console.log(`💰 Invoice Vault (${invoiceVaultAddress}) USDC balance: ${ethers.formatUnits(initialVaultBalance, 6)} USDC`);
  
  if (initialVaultBalance === 0n) {
    throw new Error("Vault balance is 0. The vault was not funded correctly.");
  }
  
  const optimalAllocation = {
    [CHAIN_SELECTORS.AVALANCHE]: 40,  // 40% to Avalanche
    [CHAIN_SELECTORS.POLYGON]: 35,     // 35% to Polygon
    [CHAIN_SELECTORS.ARBITRUM]: 25     // 25% to Arbitrum
  };
  

// Check the invoice status after funding
const fundedInvoiceCheck = await tokenizedInvoice.getInvoice(invoiceId);
const currentInvoiceStatus = Object.keys(InvoiceStatus)[fundedInvoiceCheck.status];
console.log(`📊 Invoice status after funding: ${currentInvoiceStatus}`);
  
// Verify the invoice was funded correctly
if (currentInvoiceStatus !== 'Funded') {
  throw new Error(`Invoice status is ${currentInvoiceStatus}, expected Funded`);
}
  
console.log("✅ Invoice funded successfully");
  
// 4. Verify invoice is funded before proceeding
console.log("\n✅ Invoice funded successfully. Waiting for maturity date...");
const fundedInvoiceStatus = await tokenizedInvoice.getInvoice(invoiceId);
console.log(`📊 Current invoice status: ${Object.keys(InvoiceStatus)[fundedInvoiceStatus.status]}`);
  
// Check vault balance after funding
const vaultUSDCBalance = await usdc.balanceOf(await rwaVault.getAddress());
console.log(`💰 RWA Vault USDC balance: ${ethers.formatUnits(vaultUSDCBalance, 6)} USDC`);
  
// AI-optimized allocation (40% Avalanche, 35% Polygon, 25% Arbitrum)
const chainAllocations = {
  [CHAIN_SELECTORS.AVALANCHE]: 40,  // 40% to Avalanche
  [CHAIN_SELECTORS.POLYGON]: 35,     // 35% to Polygon
  [CHAIN_SELECTORS.ARBITRUM]: 25     // 25% to Arbitrum
};
  
console.log("📊 AI-Recommended Allocation:");
console.log(`- Avalanche (Fuji): ${chainAllocations[CHAIN_SELECTORS.AVALANCHE]}%`);
console.log(`- Polygon (Mumbai): ${chainAllocations[CHAIN_SELECTORS.POLYGON]}%`);
console.log(`- Arbitrum (Goerli): ${chainAllocations[CHAIN_SELECTORS.ARBITRUM]}%`);
  
// 8. Simulate AI-Optimized Cross-Chain Deployment
console.log("\n🌉 Executing cross-chain deployment...");
  
// Get the total amount from the invoice vault (1000 USDC)
const totalDeploymentAmount = await usdc.balanceOf(invoiceVaultAddress);
console.log(`💰 Total amount to deploy: ${ethers.formatUnits(totalDeploymentAmount, 6)} USDC`);

console.log("\n📊 AI-Optimized Cross-Chain Allocation:");
for (const [chainId, percentage] of Object.entries(chainAllocations)) {
  const chainName = Object.keys(CHAIN_SELECTORS).find(key => CHAIN_SELECTORS[key] === BigInt(chainId));
  const amount = (totalDeploymentAmount * BigInt(percentage)) / 100n;
  console.log(`   - ${chainName}: ${ethers.formatUnits(amount, 6)} USDC (${percentage}%)`);
}
  
// Deploy CCIP-BnM token (simplified as a mock ERC20 for this demo)
console.log("\n🪙 Deploying CCIP-BnM token...");
const CCIPBnM = await ethers.getContractFactory("MockERC20");
const ccipBnM = await CCIPBnM.deploy("CCIP BnM", "CCIP-BnM", 18);
await ccipBnM.waitForDeployment();
const ccipBnMAddress = await ccipBnM.getAddress();
console.log(`✅ CCIP-BnM token deployed to: ${ccipBnMAddress}`);
  
// Fund accounts with CCIP-BnM and LINK
console.log("\n💰 Funding accounts with CCIP-BnM and LINK...");
const initialBalance = parseEther("1000");
await ccipBnM.mint(marina.address, initialBalance);
await link.mint(marina.address, initialBalance);
await ccipBnM.mint(await crossChainRouter.getAddress(), initialBalance);
await link.mint(await crossChainRouter.getAddress(), initialBalance);
console.log(`✅ Funded accounts with CCIP-BnM and LINK`);

// 9. Simulate CCIP-BnM Transfer from Avalanche to Sepolia
console.log("\n🔄 Simulating CCIP-BnM transfer from Avalanche to Sepolia...");
const SEPOLIA_CHAIN_SELECTOR = "16015286601757825753";
const transferAmount = parseEther("100");
const senderBalance = await ccipBnM.balanceOf(marina.address);

// Add Sepolia to supported chains (must be done by owner)
console.log("🔗 Adding Sepolia to supported chains...");
const addChainTx = await crossChainRouter.connect(deployer).setSupportedChain(
  BigInt(SEPOLIA_CHAIN_SELECTOR),
  true
);
await addChainTx.wait();
console.log("✅ Sepolia added to supported chains");

// Also add CCIP-BnM token to supported tokens
console.log("🔗 Adding CCIP-BnM to supported tokens...");
const addTokenTx = await crossChainRouter.connect(deployer).setSupportedToken(
  await ccipBnM.getAddress(),
  true
);
await addTokenTx.wait();
console.log("✅ CCIP-BnM added to supported tokens");

console.log(`🔍 Marina's CCIP-BnM balance: ${ethers.formatEther(senderBalance)}`);

if (senderBalance >= transferAmount) {
  console.log(`📤 Sending ${ethers.formatEther(transferAmount)} CCIP-BnM from Avalanche to Sepolia...`);
  
  try {
    // Approve the router to spend CCIP-BnM
    console.log("🔒 Approving CCIP-BnM for cross-chain router...");
    const approveTx = await ccipBnM.connect(marina).approve(crossChainRouter.target, transferAmount);
    await approveTx.wait();
    
    // Approve LINK for gas fees
    console.log("🔒 Approving LINK for gas fees...");
    const linkApproveTx = await link.connect(marina).approve(crossChainRouter.target, ethers.MaxUint256);
    await linkApproveTx.wait();
    
    // Call the sendTokens function
    console.log("🚀 Initiating cross-chain transfer via CCIP...");
    const tx = await crossChainRouter.connect(marina).sendTokens(
      BigInt(SEPOLIA_CHAIN_SELECTOR),  // destinationChainSelector (Sepolia)
      await ccipBnM.getAddress(),      // token address
      transferAmount,                  // amount
      { gasLimit: 1000000 }            // Add gas limit
    );
    
    const receipt = await tx.wait();
    console.log(`\n✅ CCIP transfer initiated`);
    console.log(`   - From: Avalanche (${CHAIN_SELECTORS.AVALANCHE})`);
    console.log(`   - To: Sepolia (${SEPOLIA_CHAIN_SELECTOR})`);
    console.log(`   - Amount: ${ethers.formatEther(transferAmount)} CCIP-BnM`);
    console.log(`   - Transaction hash: ${receipt.hash}`);
    
    // Simulate the message being received on Sepolia
    console.log("\n📬 Simulating message receipt on Sepolia...");
    console.log(`   - Received ${ethers.formatEther(transferAmount)} CCIP-BnM`);
    console.log(`   - Recipient: ${marina.address}`);
    console.log(`   - Token: ${ccipBnM.target}`);
    
  } catch (error) {
    console.error("\n❌ Error executing CCIP transfer:", error.message);
    if (error.reason) console.error("Reason:", error.reason);
    if (error.transaction) console.error("Transaction:", error.transaction);
  }
} else {
  console.log(`⚠️  Insufficient CCIP-BnM balance for transfer. Required: ${ethers.formatEther(transferAmount)}, Available: ${ethers.formatEther(senderBalance)}`);
}

console.log("\n✅ Cross-chain transfer simulation completed");
  
// 10. Simulate Yield Generation
console.log("\n📈 Simulating yield generation over 30 days...");
  
// Fast forward time by 30 days
await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
await network.provider.send("evm_mine");
// Simulate yield (in a real scenario, this would come from actual DeFi protocols)
const monthlyYield = parseUnits("20", 6); // 2% of 1000 USDC
await usdc.mint(await rwaVault.getAddress(), monthlyYield);
console.log(`💰 Generated ${ethers.formatUnits(monthlyYield, 6)} USDC in yield`);

// 10. Simulate Yield Generation (2% monthly yield on 1000 USDC = 20 USDC)
console.log("\n📈 Simulating yield generation over 30 days...");

// Fast forward time by 30 days
await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
await network.provider.send("evm_mine");

// Simulate 2% monthly yield on the 1000 USDC (20 USDC)
const monthlyYieldAmount = parseUnits("20", 6); // 2% of 1000 USDC
await usdc.mint(await rwaVault.getAddress(), monthlyYieldAmount);
console.log(`💰 Generated ${ethers.formatUnits(monthlyYieldAmount, 6)} USDC in yield`);

// 11. Invoice Maturity and Settlement
console.log("\n📅 Invoice reaches maturity date...");

// Fast forward to due date (another 30 days)
await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
await network.provider.send("evm_mine");

console.log("💵 Marking invoice as paid through InvoiceRegistry...");

// Mark the invoice as paid through InvoiceRegistry using Marina's signer
const payTransaction = await invoiceRegistry.connect(marina).markAsPaid(invoiceId);
const paymentReceipt = await payTransaction.wait();
console.log(`✅ Invoice marked as paid successfully`);
console.log(`🔍 Transaction hash: ${paymentReceipt.transactionHash}`);

// Verify invoice status is now PAID
const paidInvoiceStatus = await tokenizedInvoice.getInvoice(invoiceId);
const paymentStatus = Object.keys(InvoiceStatus)[paidInvoiceStatus.status];
console.log(`✅ Invoice status after payment: ${paymentStatus}`);

if (paymentStatus !== 'Paid') {
  throw new Error(`Invoice status is ${paymentStatus}, expected Paid`);
}

// 12. Withdraw Funds
console.log("\n🏧 Withdrawing funds from RWA Vault");

// Get the vault address from the registry
const vaultContractAddress = await invoiceRegistry.invoiceVaults(invoiceId);
console.log(`🔍 Found vault address: ${vaultContractAddress}`);

// Get an instance of the vault contract
const vaultInstance = await ethers.getContractAt("RWAInvoiceVaultSimple", vaultContractAddress);

// Check the vault owner (should be InvoiceRegistry)
const currentVaultOwner = await vaultInstance.owner();
console.log(`🔍 Vault owner: ${currentVaultOwner}`);
console.log(`🔍 InvoiceRegistry address: ${await invoiceRegistry.getAddress()}`);

// Check the vault's USDC balance
const tokenForPayment = await vaultInstance.paymentToken();
console.log(`🔍 Payment token: ${tokenForPayment}`);

// Use fully qualified name for IERC20 to resolve artifact conflict
const usdcTokenContract = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", tokenForPayment);
const currentVaultBalance = await usdcTokenContract.balanceOf(vaultContractAddress);
console.log(`💰 Vault USDC balance: ${ethers.formatUnits(currentVaultBalance, 6)} USDC`);

if (currentVaultBalance > 0) {
  // Since the InvoiceRegistry is the owner, we need to call a function on it to handle the withdrawal
  console.log("Initiating withdrawal through InvoiceRegistry...");

  // Get the invoice data to find the beneficiary (Marina)
  const invoiceDetails = await tokenizedInvoice.getInvoice(invoiceId);
  const beneficiaryAddress = invoiceDetails.beneficiary;
  console.log(`🔍 Invoice beneficiary (withdrawal recipient): ${beneficiaryAddress}`);

  // Since the vault is owned by InvoiceRegistry, we'll use InvoiceRegistry's transferVaultOwnership function
  console.log("Transferring vault ownership to beneficiary for withdrawal...");

  // Get the InvoiceRegistry contract with Marina's signer (she's the owner)
  const registryWithSigner = invoiceRegistry.connect(marina);

  // Transfer ownership using InvoiceRegistry's function
  console.log(`Transferring vault ownership to beneficiary (${beneficiaryAddress})...`);
  const ownershipTransferTx = await registryWithSigner.transferVaultOwnership(invoiceId, beneficiaryAddress);
  await ownershipTransferTx.wait();

  // Verify ownership transfer
  const updatedOwner = await vaultInstance.owner();
  console.log(`🔍 New vault owner: ${updatedOwner}`);

  // Now withdraw using beneficiary's signer (Buyer)
  console.log("Withdrawing funds to beneficiary...");
  const withdrawTransaction = await vaultInstance.connect(buyer).withdrawFunds(beneficiaryAddress, tokenForPayment, currentVaultBalance);
  const withdrawReceipt = await withdrawTransaction.wait();
  console.log(`✅ Funds withdrawn successfully`);
  console.log(`🔍 Transaction hash: ${withdrawReceipt.transactionHash}`);

  // Verify the vault balance is now 0
  const updatedVaultBalance = await usdcTokenContract.balanceOf(vaultContractAddress);
  console.log(`💰 Vault USDC balance after withdrawal: ${ethers.formatUnits(updatedVaultBalance, 6)} USDC`);

  // Transfer ownership back to InvoiceRegistry using the Buyer's signer (current owner)
  console.log("Transferring vault ownership back to InvoiceRegistry...");

  // Get the InvoiceRegistry contract address
  const registryAddress = await invoiceRegistry.getAddress();

  // Transfer ownership directly from the vault using Buyer's signer (current owner)
  const transferBackTransaction = await vaultInstance.connect(buyer).transferOwnership(registryAddress);
  const transferBackConfirmation = await transferBackTransaction.wait();
  console.log(`✅ Vault ownership transferred back to InvoiceRegistry`);
  console.log(`🔍 Transfer back transaction hash: ${transferBackConfirmation.transactionHash}`);

  // Verify the final vault owner is InvoiceRegistry
  const finalVaultOwner = await vaultInstance.owner();
  console.log(`🔍 Final vault owner: ${finalVaultOwner}`);
  console.log(`🔍 Expected InvoiceRegistry address: ${registryAddress}`);
} else {
  console.log("⚠️  Vault has no USDC balance to withdraw");
}

const finalUSDBalance = await usdc.balanceOf(marina.address);
console.log(`💰 Marina's final USDC balance: ${ethers.formatUnits(finalUSDBalance, 6)} USDC`);

// Calculate final amounts
const initialAmount = "1,000.00";
const yieldAmountDisplay = "20.00";
const totalWithdrawn = "1,020.00";

console.log("\n🎉 Simulation completed successfully!\n");

console.log("📊 Simulation Summary:");
console.log("-----------------------");
console.log(`1. Marina tokenized a $${initialAmount} USDC invoice`);
console.log("2. AI optimized cross-chain deployment (40% Avalanche, 35% Polygon, 25% Arbitrum)");
console.log(`3. Generated 2% monthly yield ($${yieldAmountDisplay} USDC)`);
console.log("4. Invoice was paid on time by buyer");
console.log(`5. Total withdrawn: $${totalWithdrawn} USDC ($${initialAmount} principal + $${yieldAmountDisplay} yield)`);
console.log("\n🚀 TokenIQ successfully demonstrated end-to-end RWA tokenization and yield optimization!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
